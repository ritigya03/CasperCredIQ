// wallet.ts
import { CLPublicKey, DeployUtil } from 'casper-js-sdk';

export type WalletState = {
  publicKey: string | null;
  isConnected: boolean;
  accountName?: string;
  walletType?: 'csprclick' | 'casper-wallet' | 'unknown';
};

function getWalletProvider(): any | null {
  if (typeof window === 'undefined') return null;

  const { csprclick, CasperWalletProvider } = window as any;

  if (csprclick) return csprclick;
  if (CasperWalletProvider) return CasperWalletProvider();
  return null;
}

function getWalletType(): 'csprclick' | 'casper-wallet' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const { csprclick, CasperWalletProvider } = window as any;

  if (csprclick) return 'csprclick';
  if (CasperWalletProvider) return 'casper-wallet';

  return 'unknown';
}

function getDeployHashAsHex(deploy: DeployUtil.Deploy): string {
  const deployHash = deploy.hash;
  return Buffer.from(deployHash).toString('hex');
}

function debugResponse(response: any): void {
  console.group('Wallet Response Debug');
  console.log('Type:', typeof response);
  console.log('Is Object?', typeof response === 'object');
  console.log('Full response:', response);

  if (typeof response === 'object' && response !== null) {
    console.log('Keys:', Object.keys(response));
    if (response.cancelled !== undefined) {
      console.log('Cancellation flag:', response.cancelled);
      console.log('Message:', response.message || 'None');
    }
  }
  console.groupEnd();
}

class WalletManager {
  private state: WalletState = {
    publicKey: null,
    isConnected: false,
    walletType: 'unknown',
  };

  private listeners: Array<(state: WalletState) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    window.addEventListener('casper-wallet:activeKeyChanged', this.handleActiveKeyChange.bind(this));
    window.addEventListener('casper-wallet:disconnected', this.handleDisconnect.bind(this));
    window.addEventListener('csprclick:activeKeyChanged', this.handleActiveKeyChange.bind(this));
    window.addEventListener('csprclick:disconnected', this.handleDisconnect.bind(this));
  }

  private handleActiveKeyChange = () => {
    this.syncWithWallet();
  };

  private handleDisconnect = () => {
    this.disconnect();
  };

  async syncWithWallet(): Promise<WalletState> {
    const provider = getWalletProvider();
    if (!provider) {
      this.disconnect();
      return this.state;
    }

    try {
      const walletType = getWalletType();
      let publicKey: string | null = null;

      if (walletType === 'csprclick' && typeof provider.getActivePublicKey === 'function') {
        publicKey = await provider.getActivePublicKey();
      } else if (walletType === 'casper-wallet') {
        if (typeof provider.getActivePublicKey === 'function') {
          publicKey = await provider.getActivePublicKey();
        } else if (typeof provider.getActivePublicKeyHex === 'function') {
          publicKey = await provider.getActivePublicKeyHex();
        }
      }

      this.state = {
        publicKey,
        isConnected: !!publicKey,
        walletType,
      };

      this.notifyListeners();
    } catch (error) {
      console.warn('Failed to sync with wallet:', error);
      this.disconnect();
    }

    return this.state;
  }

  async connect(): Promise<WalletState> {
    const provider = getWalletProvider();
    if (!provider) {
      throw new Error('Casper wallet not installed. Please install CSPR.click or Casper Wallet.');
    }

    try {
      const walletType = getWalletType();

      if (walletType === 'csprclick' && typeof provider.requestConnection === 'function') {
        await provider.requestConnection();
      } else if (walletType === 'casper-wallet') {
        if (typeof provider.connect === 'function') {
          await provider.connect();
        } else if (typeof provider.requestConnection === 'function') {
          await provider.requestConnection();
        }
      }

      await this.syncWithWallet();

      if (!this.state.publicKey) {
        throw new Error('Connection failed. Please unlock your wallet and approve connection.');
      }

      return this.state;
    } catch (error: any) {
      throw new Error(`Failed to connect: ${error.message || 'Unknown error'}`);
    }
  }

  getState(): WalletState {
    return { ...this.state };
  }

  async signDeploy(deploy: DeployUtil.Deploy): Promise<DeployUtil.Deploy> {
    const provider = getWalletProvider();
    if (!provider) {
      throw new Error('Wallet not found.');
    }

    await this.syncWithWallet();
    if (!this.state.publicKey) {
      throw new Error('Wallet not connected.');
    }

    try {
      const deployJson = DeployUtil.deployToJson(deploy);
      const deployHashHex = getDeployHashAsHex(deploy);
      console.log('Requesting signature for deploy:', deployHashHex);

      const response = await provider.sign(JSON.stringify(deployJson), this.state.publicKey);

      console.log('Wallet response received:');
      debugResponse(response);

      // 1. Handle cancellation first
      if (response && typeof response === 'object' && response.cancelled !== undefined) {
        if (response.cancelled === true) {
          throw new Error('Transaction signing was cancelled by the user.');
        }
        // cancelled === false means approved → continue
      }

      // 2. Primary format: { signature: "..." } (most common now)
if (response && typeof response === 'object' && response.signature) {
  const signatureHex = response.signature as string;
  const publicKey = CLPublicKey.fromHex(this.state.publicKey);

  const signatureBytes = Uint8Array.from(Buffer.from(signatureHex, 'hex'));
  const signedDeploy = DeployUtil.setSignature(deploy, signatureBytes, publicKey);

  console.log('Deploy signed using signature field:', getDeployHashAsHex(signedDeploy));
  return signedDeploy;
}

      // 3. Fallback: stringified JSON response
      let parsed = response;
      if (typeof response === 'string') {
        try {
          parsed = JSON.parse(response);
        } catch {
          throw new Error('Wallet returned invalid string response');
        }
      }

      // 4. Fallback: full deploy object or { deploy: ... }
      if (parsed && typeof parsed === 'object') {
        let signedDeploy: DeployUtil.Deploy;

        if (parsed.deploy) {
          const result = DeployUtil.deployFromJson(parsed.deploy);
          if (result.err) throw new Error(`Failed to parse deploy: ${result.err}`);
          signedDeploy = result.val;
        } else if (parsed.body && parsed.header && parsed.payment) {
          const result = DeployUtil.deployFromJson(parsed);
          if (result.err) throw new Error(`Failed to parse full deploy: ${result.err}`);
          signedDeploy = result.val;
        } else {
          throw new Error(`Unsupported response format. Keys: ${Object.keys(parsed).join(', ')}`);
        }

        console.log('Deploy signed via fallback parsing:', getDeployHashAsHex(signedDeploy));
        return signedDeploy;
      }

      throw new Error('Unexpected wallet response format');
    } catch (error: any) {
      if (error.message?.includes('cancelled') || error.message?.includes('Cancelled')) {
        throw error;
      }
      if (error.message?.includes('rejected')) {
        throw new Error('Transaction was rejected by the user.');
      }
      throw new Error(`Signing failed: ${error.message || 'Unknown error'}`);
    }
  }

  disconnect() {
    this.state = {
      publicKey: null,
      isConnected: false,
      walletType: 'unknown',
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: WalletState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  isWalletAvailable(): boolean {
    return !!getWalletProvider();
  }

  getWalletType(): string {
    return this.state.walletType || 'unknown';
  }
}

export const walletManager = new WalletManager();

export function checkWalletAvailability() {
  return walletManager.isWalletAvailable();
}