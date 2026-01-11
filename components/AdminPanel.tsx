'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CLPublicKey,
  RuntimeArgs,
  DeployUtil,
  CLValueBuilder,
} from 'casper-js-sdk';
import { Copy, ExternalLink, CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react';

// Mock wallet manager for demo
const walletManager = {
  state: { isConnected: false, publicKey: null, walletType: null },
  getState() { return this.state; },
  subscribe(callback) {
    const interval = setInterval(() => callback(this.state), 1000);
    return () => clearInterval(interval);
  },
  async syncWithWallet() { return this.state; },
  async connect() {
    this.state = {
      isConnected: true,
      publicKey: '0203a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      walletType: 'Casper Wallet'
    };
    return this.state;
  },
  disconnect() {
    this.state = { isConnected: false, publicKey: null, walletType: null };
  },
  isWalletAvailable() { return true; },
  async signDeploy(deploy) { return deploy; }
};

const CASPER_CONFIG = {
  CONTRACT_HASH: 'hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  PACKAGE_HASH: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  CHAIN_NAME: 'casper-test',
  PAYMENT_AMOUNTS: { REVOKE: 5000000000 },
  NETWORK: { EXPLORER_URL: 'https://testnet.cspr.live' }
};

const ENTRY_POINTS = {
  REVOKE_CREDENTIAL: 'revoke_credential'
};

function extractContractHash(hash) {
  if (hash.startsWith('hash-')) return hash.slice(5);
  if (hash.startsWith('contract-')) return hash.slice(9);
  return hash;
}

export default function AdminPanel() {
  const [credentialId, setCredentialId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [walletState, setWalletState] = useState(walletManager.getState());
  const [deployHash, setDeployHash] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const unsubscribe = walletManager.subscribe((state) => {
      setWalletState(state);
    });
    walletManager.syncWithWallet().catch(console.error);
    return unsubscribe;
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = (hash) => {
    window.open(`${CASPER_CONFIG.NETWORK.EXPLORER_URL}/deploy/${hash}`, '_blank');
  };

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: 'info', text: '🔗 Connecting to wallet...' });
      setDeployHash(null);
      const state = await walletManager.connect();
      setWalletState(state);
      setMessage({ type: 'success', text: `Connected to ${state.walletType}` });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to connect wallet', details: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    walletManager.disconnect();
    setMessage({ type: 'info', text: 'Wallet disconnected' });
    setDeployHash(null);
  }, []);

  const searchCredentials = async () => {
    if (!credentialId.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Mock search - in real app, query contract or backend
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockResults = [
        {
          id: credentialId,
          holder: '0203a1b2c3d4...f0a1b2c3',
          issuer: '0201234567...89abcdef',
          issued: '2024-01-15',
          expires: '2025-01-15',
          status: 'Active',
          confidence: 87
        }
      ];
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (credentialId.trim()) {
        searchCredentials();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [credentialId]);

  async function handleRevoke() {
    try {
      setLoading(true);
      setDeployHash(null);
      setMessage({ type: 'info', text: '📝 Preparing revoke transaction...' });

      if (!walletState.publicKey) {
        throw new Error('Wallet not connected.');
      }

      if (!credentialId.trim()) {
        throw new Error('Please enter a credential ID to revoke.');
      }

      const freshState = await walletManager.syncWithWallet();
      if (!freshState.publicKey) {
        throw new Error('Wallet disconnected during operation.');
      }

      const issuerPk = CLPublicKey.fromHex(freshState.publicKey);

      console.log('Revoking credential:', {
        credentialId: credentialId,
        issuer: freshState.publicKey,
        packageHash: CASPER_CONFIG.PACKAGE_HASH
      });

      // Prepare runtime args according to your contract
      const runtimeArgs = RuntimeArgs.fromMap({
        'credential_id': CLValueBuilder.string(credentialId)
      });

      let packageHash = CASPER_CONFIG.PACKAGE_HASH;
      packageHash = extractContractHash(packageHash);

      const deployParams = new DeployUtil.DeployParams(
        issuerPk,
        CASPER_CONFIG.CHAIN_NAME,
        1,
        1800000
      );

      const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(packageHash, 'hex')),
        ENTRY_POINTS.REVOKE_CREDENTIAL,
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.REVOKE
      );

      const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

      setMessage({ type: 'info', text: '✍️ Please approve signing in your wallet...' });

      const signedDeploy = await walletManager.signDeploy(deploy);

      setMessage({ type: 'info', text: '📤 Submitting transaction to network...' });

      const signedDeployJson = DeployUtil.deployToJson(signedDeploy);
      
      // Mock submission - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const hash = '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd';
      
      setDeployHash(hash);

      setMessage({
        type: 'success',
        text: '✅ Credential revoked successfully!',
        details: `Credential ID "${credentialId}" has been permanently revoked on the blockchain.`
      });

      setCredentialId('');
      setSearchResults([]);
    } catch (e) {
      console.error('Revoke credential error:', e);

      let errorText = 'Revoke failed';
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
      } else if (e.message.includes('NotAuthorized') || e.message.includes('NotAnIssuer')) {
        errorText = 'Not authorized';
        errorDetails = 'You are not authorized to revoke this credential. Only the issuer or contract owner can revoke.';
      } else if (e.message.includes('CredentialNotFound')) {
        errorText = 'Credential not found';
        errorDetails = 'This credential ID does not exist in the contract.';
      }

      setMessage({ type: 'error', text: errorText, details: errorDetails });
      setDeployHash(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Revoke Credential</h2>

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

        {/* Revoke Form */}
        {walletState.isConnected && (
          <div className="space-y-5">
            {/* Warning Banner */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Warning: Permanent Action</h3>
                  <p className="text-sm text-red-700">
                    Revoking a credential is permanent and cannot be undone. Only the issuer or contract owner can revoke credentials.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential ID to Revoke
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  disabled={loading}
                  placeholder="CRED_1234567890_ABC123DEF"
                  className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the exact credential ID from the blockchain
              </p>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Credential Details
                </h4>
                {searchResults.map((result, idx) => (
                  <div key={idx} className="bg-white rounded p-3 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-medium ${
                          result.status === 'Active' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>
                        <span className="ml-2 font-medium text-blue-600">{result.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Issued:</span>
                        <span className="ml-2 text-gray-700">{result.issued}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Expires:</span>
                        <span className="ml-2 text-gray-700">{result.expires}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Holder:</span>
                      <span className="ml-2 font-mono text-xs text-gray-700">{result.holder}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleRevoke}
              disabled={!credentialId.trim() || loading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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
                  <XCircle className="w-5 h-5 mr-2" />
                  Revoke Credential
                </>
              )}
            </button>
          </div>
        )}

        {/* Deploy Hash Display */}
        {deployHash && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Transaction Successful
              </h3>
              <button
                onClick={() => openExplorer(deployHash)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center transition-colors"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>
            
            <div className="bg-white p-3 rounded border border-blue-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">Deploy Hash:</span>
                <button
                  onClick={() => copyToClipboard(deployHash)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm font-mono text-gray-800 break-all bg-gray-50 p-2 rounded">
                {deployHash}
              </p>
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
              {message.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />}
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

        {/* Instructions */}
        {walletState.isConnected && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">How to revoke:</h4>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Connect your wallet (must be issuer or contract owner)</li>
              <li>Enter the credential ID you want to revoke</li>
              <li>Verify the credential details shown</li>
              <li>Click "Revoke Credential"</li>
              <li>Sign the transaction in your wallet</li>
              <li>Wait for blockchain confirmation (1-2 minutes)</li>
            </ol>
            <p className="text-xs text-red-600 mt-3 font-medium">
              ⚠️ Only the original issuer or contract owner can revoke credentials. Unauthorized attempts will fail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}