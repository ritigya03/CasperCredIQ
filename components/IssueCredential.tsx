'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CLPublicKey,
  RuntimeArgs,
  CLValueBuilder,
  DeployUtil,
  CLByteArray,
} from 'casper-js-sdk';
import { Copy, ExternalLink, CheckCircle, XCircle, User, Download } from 'lucide-react';

import { walletManager } from '@/lib/wallet';
import { submitSignedDeploy } from '@/lib/casper';
import { CASPER_CONFIG, ENTRY_POINTS, PARAM_NAMES } from '@/utils/constants';

function createOdraAddress(publicKeyHex: string): CLByteArray {
  const pk = CLPublicKey.fromHex(publicKeyHex);
  const accountHash = pk.toAccountHash();

  const bytes = new Uint8Array(33);
  bytes[0] = 0;
  bytes.set(accountHash, 1);

  return new CLByteArray(bytes);
}

function getDeployHashAsHex(deploy: DeployUtil.Deploy): string {
  const deployHash = deploy.hash;
  return Buffer.from(deployHash).toString('hex');
}

export default function IssueCredential() {
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [role, setRole] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
    details?: string;
  } | null>(null);
  const [walletState, setWalletState] = useState(walletManager.getState());
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isValidPublicKey, setIsValidPublicKey] = useState<boolean | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const unsubscribe = walletManager.subscribe((state) => {
      setWalletState(state);
    });

    walletManager.syncWithWallet().catch(console.error);

    return unsubscribe;
  }, []);

  // Validate public key format
  useEffect(() => {
    if (!recipientPublicKey) {
      setIsValidPublicKey(null);
      return;
    }

    try {
      // Try to parse the public key
      CLPublicKey.fromHex(recipientPublicKey);
      setIsValidPublicKey(true);
    } catch {
      setIsValidPublicKey(false);
    }
  }, [recipientPublicKey]);
  // Generate QR code when deployHash changes
useEffect(() => {
  if (deployHash && canvasRef.current) {
    generateQRCode(deployHash);
  } else {
    setQrCodeDataUrl(null);
  }
}, [deployHash]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = (hash: string) => {
    window.open(`${CASPER_CONFIG.NETWORK.EXPLORER_URL}/deploy/${hash}`, '_blank');
  };

  const fillOwnAddress = () => {
    if (walletState.publicKey) {
      setRecipientPublicKey(walletState.publicKey);
    }
  };

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({
        type: 'info',
        text: '🔗 Connecting to wallet...'
      });
      setDeployHash(null);

      const state = await walletManager.connect();
      setWalletState(state);
      setMessage({
        type: 'success',
        text: `Connected to ${state.walletType}`
      });
    } catch (e: any) {
      setMessage({
        type: 'error',
        text: 'Failed to connect wallet',
        details: e.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    walletManager.disconnect();
    setMessage({
      type: 'info',
      text: 'Wallet disconnected'
    });
    setDeployHash(null);
  }, []);

  async function issueCredential() {
    try {
      setLoading(true);
      setDeployHash(null);
      setMessage({
        type: 'info',
        text: '📝 Preparing transaction...'
      });

      if (!walletState.publicKey) {
        throw new Error('Wallet not connected.');
      }

      if (!recipientPublicKey) {
        throw new Error('Please enter recipient public key.');
      }

      if (!isValidPublicKey) {
        throw new Error('Invalid recipient public key format.');
      }

      const freshState = await walletManager.syncWithWallet();
      if (!freshState.publicKey) {
        throw new Error('Wallet disconnected during operation.');
      }

      // Issuer signs the transaction (connected wallet)
      const issuerPk = CLPublicKey.fromHex(freshState.publicKey);
      
      // Recipient receives the credential
      const recipientAddress = createOdraAddress(recipientPublicKey);

      // ⚠️ CRITICAL: Convert days to MILLISECONDS, not seconds!
      // This is the workaround for the contract bug where expires_at = now + ttl_seconds
      // But 'now' is in milliseconds, so we pass milliseconds instead of seconds
      const ttlMilliseconds = days * 24 * 60 * 60 * 1000;

      console.log('Issuing credential:', {
        issuer: freshState.publicKey,
        recipient: recipientPublicKey,
        role,
        days,
        ttlMilliseconds,
        contractHash: CASPER_CONFIG.CONTRACT_HASH
      });

      const runtimeArgs = RuntimeArgs.fromMap({
        [PARAM_NAMES.USER]: recipientAddress,
        [PARAM_NAMES.ROLE]: CLValueBuilder.string(role),
        [PARAM_NAMES.TTL_SECONDS]: CLValueBuilder.u64(ttlMilliseconds), // Now in milliseconds!
      });

      // Clean contract hash (remove any prefixes)
      let contractHash = CASPER_CONFIG.CONTRACT_HASH;
      if (contractHash.startsWith('hash-')) {
        contractHash = contractHash.slice(5);
      }
      if (contractHash.startsWith('contract-')) {
        contractHash = contractHash.slice(9);
      }

      const deployParams = new DeployUtil.DeployParams(
        issuerPk,
        CASPER_CONFIG.CHAIN_NAME,
        1,
        1800000
      );

      const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(contractHash, 'hex')),
        ENTRY_POINTS.MINT, // Use constant instead of hardcoded string
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.MINT
      );

      const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

      setMessage({
        type: 'info',
        text: '✍️ Please approve signing in your wallet...'
      });

      const signedDeploy = await walletManager.signDeploy(deploy);

      setMessage({
        type: 'info',
        text: '📤 Submitting transaction to network...'
      });

      const signedDeployJson = DeployUtil.deployToJson(signedDeploy);
      const hash = await submitSignedDeploy(signedDeployJson);
      
      // Store the deploy hash
      setDeployHash(hash);

      setMessage({
        type: 'success',
        text: `✅ Credential issued successfully!`,
        details: `Recipient: ${recipientPublicKey.slice(0, 8)}...${recipientPublicKey.slice(-6)} | Role: ${role} | Valid for ${days} days`
      });

      // Clear form
      setRecipientPublicKey('');
      setRole('');
      setDays(30);
    } catch (e: any) {
      console.error('Issue credential error:', e);

      let errorText = 'Transaction failed';
      let errorDetails = e.message;

      if (e.message.includes('cancelled') || e.message.includes('cancelled by the user')) {
        errorText = 'Signing was cancelled';
        errorDetails = 'User cancelled the signing request in wallet.';
      } else if (e.message.includes('rejected')) {
        errorText = 'Transaction rejected';
        errorDetails = 'User rejected the transaction.';
      } else if (e.message.includes('not connected') || e.message.includes('disconnected')) {
        errorText = 'Wallet disconnected';
        errorDetails = 'Please reconnect your wallet and try again.';
      } else if (e.message.includes('Invalid') || e.message.includes('public key')) {
        errorText = 'Invalid public key';
        errorDetails = 'Please enter a valid Casper public key (starting with 01 or 02).';
      } else if (e.message.includes('NotAuthorized')) {
        errorText = 'Not authorized to issue credentials';
        errorDetails = 'Your account is not registered as an authorized issuer for this contract.';
      } else if (e.message.includes('NotIssuer') || e.message.includes('NotAnIssuer')) {
        errorText = 'Not an authorized issuer';
        errorDetails = 'Only authorized issuers can mint credentials. Contact the contract owner.';
      }

      setMessage({
        type: 'error',
        text: errorText,
        details: errorDetails
      });
      setDeployHash(null);
    } finally {
      setLoading(false);
    }
  }
const generateQRCode = async (hash: string) => {
  try {
    // Use qrcode library from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      if (!document.querySelector('script[src*="qrcode"]')) {
        document.head.appendChild(script);
      } else {
        resolve(null);
      }
    });

    // Wait a bit for library to load
    await new Promise(resolve => setTimeout(resolve, 100));

    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    // Access QRCode through window with type assertion
    const qrCodeLib = (window as any).QRCode;
    
    const qr = new qrCodeLib(tempDiv, {
      text: hash,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: qrCodeLib.CorrectLevel?.H || 2
    });
    
    setTimeout(() => {
      const img = tempDiv.querySelector('img');
      const canvas = tempDiv.querySelector('canvas');
      
      if (img && img.src) {
        setQrCodeDataUrl(img.src);
      } else if (canvas) {
        setQrCodeDataUrl(canvas.toDataURL('image/png'));
      }
      
      document.body.removeChild(tempDiv);
    }, 200);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    // Fallback: generate simple placeholder
    generateFallbackQR(hash);
  }
};
const generateFallbackQR = (text: string) => {
  if (!canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 256;
  canvas.height = 256;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  
  // Black border
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 240, 256, 16);
  ctx.fillRect(0, 0, 16, 256);
  ctx.fillRect(240, 0, 16, 256);
  
  // Center text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('QR CODE', 128, 100);
  ctx.font = '10px monospace';
  ctx.fillText(text.slice(0, 16), 128, 130);
  ctx.fillText(text.slice(16, 32), 128, 145);
  ctx.fillText('...', 128, 160);
  
  setQrCodeDataUrl(canvas.toDataURL('image/png'));
};
const downloadQRCode = () => {
  if (!qrCodeDataUrl) return;
  
  const link = document.createElement('a');
  link.download = `credential-${deployHash?.slice(0, 8)}.png`;
  link.href = qrCodeDataUrl;
  link.click();
};
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl mx-auto border border-gray-100">
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Issue Credential</h2>

      {/* Wallet Status */}
      <div className="mb-6">
        {!walletManager.isWalletAvailable() ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ No Wallet Detected</p>
            <p className="text-yellow-700 text-sm">
              Install{' '}
              <a href="https://cspr.click" className="underline font-medium hover:text-yellow-900">
                CSPR.click
              </a>{' '}
              or{' '}
              <a href="https://www.casperwallet.io" className="underline font-medium hover:text-yellow-900">
                Casper Wallet
              </a>
            </p>
          </div>
        ) : !walletState.isConnected ? (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <span className="mr-2">🔗</span>
                Connect Wallet
              </>
            )}
          </button>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <div>
                  <p className="text-green-800 font-semibold">
                    Connected ({walletState.walletType})
                  </p>
                  <p className="text-green-700 text-sm mt-1 font-mono">
                    {walletState.publicKey?.slice(0, 8)}...{walletState.publicKey?.slice(-6)}
                  </p>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 py-1.5 px-3 rounded-lg transition-colors duration-200 flex items-center"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {walletState.isConnected && (
        <div className="space-y-5">
          {/* Recipient Public Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Public Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={recipientPublicKey}
                onChange={(e) => setRecipientPublicKey(e.target.value)}
                disabled={loading}
                placeholder="01abc123... or 02def456..."
                className={`w-full border rounded-lg p-3 pl-10 pr-24 focus:ring-2 focus:border-transparent transition-all font-mono text-sm ${
                  isValidPublicKey === false 
                    ? 'border-red-300 focus:ring-red-500' 
                    : isValidPublicKey === true 
                    ? 'border-green-300 focus:ring-green-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={fillOwnAddress}
                disabled={loading}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
              >
                Use Mine
              </button>
            </div>
            {isValidPublicKey === false && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <XCircle className="w-3 h-3 mr-1" />
                Invalid public key format
              </p>
            )}
            {isValidPublicKey === true && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid public key
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Enter the Casper public key of the account that will receive the credential
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Select a role</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
              <option value="verified">Verified</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* Validity Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validity Period (Days)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={loading}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-lg font-semibold text-gray-700 min-w-[60px]">
                {days} days
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 day</span>
              <span>365 days</span>
            </div>
            <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
              ℹ️ TTL is automatically converted to milliseconds for the contract
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={issueCredential}
            disabled={!role || !recipientPublicKey || !isValidPublicKey || loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <span className="mr-2">📝</span>
                Issue Credential
              </>
            )}
          </button>
        </div>
      )}

      {/* Deploy Hash Display */}
      {deployHash && qrCodeDataUrl && (
  <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-blue-800 flex items-center">
        <CheckCircle className="w-4 h-4 mr-2" />
        Credential Issued
      </h3>
      <button
        onClick={() => openExplorer(deployHash)}
        className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors"
      >
        View on Explorer
        <ExternalLink className="w-3 h-3 ml-1" />
      </button>
    </div>
    
    {/* QR Code Only */}
    <div className="bg-white p-4 rounded-lg flex flex-col items-center">
      <img 
        src={qrCodeDataUrl} 
        alt="Credential QR Code" 
        className="w-48 h-48 border-4 border-gray-200 rounded-lg"
      />
      <button
        onClick={downloadQRCode}
        className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
      >
        <Download className="w-4 h-4 mr-1" />
        Download QR Code
      </button>
      <p className="text-xs text-gray-500 mt-2">Scan to verify credential</p>
    </div>
  </div>
)}
      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 border border-red-200' :
          message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start">
            {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />}
            {message.type === 'error' && <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`font-medium ${
                message.type === 'success' ? 'text-green-800' :
                message.type === 'error' ? 'text-red-800' :
                message.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {message.text}
              </p>
              {message.details && (
                <p className={`text-sm mt-1 ${
                  message.type === 'success' ? 'text-green-700' :
                  message.type === 'error' ? 'text-red-700' :
                  message.type === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  {message.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}