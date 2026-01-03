'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CLPublicKey,
  RuntimeArgs,
  DeployUtil,
  CLByteArray,
} from 'casper-js-sdk';
import { Copy, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import { walletManager } from '@/lib/wallet';
import { submitSignedDeploy } from '@/lib/casper';
import { CASPER_CONFIG } from '@/utils/constants';

function createOdraAddress(publicKeyHex: string): CLByteArray {
  const pk = CLPublicKey.fromHex(publicKeyHex);
  const accountHash = pk.toAccountHash();

  const bytes = new Uint8Array(33);
  bytes[0] = 0;
  bytes.set(accountHash, 1);

  return new CLByteArray(bytes);
}

export default function AdminPanel() {
  const [addressToRevoke, setAddressToRevoke] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingIssuer, setCheckingIssuer] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
    details?: string;
  } | null>(null);
  
  const [isIssuer, setIsIssuer] = useState(false);
  const [issuerAddress, setIssuerAddress] = useState('');
  const [walletState, setWalletState] = useState(walletManager.getState());
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = walletManager.subscribe((state) => {
      setWalletState(state);
    });

    walletManager.syncWithWallet().catch(console.error);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (walletState.isConnected) {
      checkIssuerStatus();
    }
  }, [walletState.isConnected, walletState.publicKey]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = (hash: string) => {
    window.open(`${CASPER_CONFIG.NETWORK.EXPLORER_URL}/deploy/${hash}`, '_blank');
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
    setIsIssuer(false);
  }, []);

  async function checkIssuerStatus() {
    try {
      setCheckingIssuer(true);
      
      if (!walletState.publicKey) {
        setIsIssuer(false);
        setCheckingIssuer(false);
        return;
      }

      // For now, set a placeholder issuer address
      // You'll need to query your contract to get the actual issuer
      // This is where you'd call: casperService.queryContract(...) 
      const mockIssuerPublicKey = walletState.publicKey; // Replace with actual contract query
      
      setIssuerAddress(mockIssuerPublicKey);
      setIsIssuer(walletState.publicKey === mockIssuerPublicKey);
      
    } catch (error) {
      console.error('Failed to check issuer status:', error);
      setIsIssuer(false);
      setMessage({
        type: 'error',
        text: 'Failed to verify issuer status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setCheckingIssuer(false);
    }
  }

  async function handleRevoke() {
    try {
      setLoading(true);
      setDeployHash(null);
      setMessage({
        type: 'info',
        text: '📝 Preparing revoke transaction...'
      });

      if (!walletState.publicKey) {
        throw new Error('Wallet not connected.');
      }

      if (!isIssuer) {
        throw new Error('You are not the contract issuer.');
      }

      if (!addressToRevoke) {
        throw new Error('Please enter an address to revoke.');
      }

      // Validate the address format
      if (!addressToRevoke.startsWith('01') && !addressToRevoke.startsWith('02')) {
        throw new Error('Invalid public key format. Should start with 01 or 02.');
      }

      const freshState = await walletManager.syncWithWallet();
      if (!freshState.publicKey) {
        throw new Error('Wallet disconnected during operation.');
      }

      const issuerPk = CLPublicKey.fromHex(freshState.publicKey);
      const userAddress = createOdraAddress(addressToRevoke);

      const runtimeArgs = RuntimeArgs.fromMap({
        user: userAddress,
      });

      let contractHash = CASPER_CONFIG.CONTRACT_HASH;
      if (contractHash.startsWith('hash-')) {
        contractHash = contractHash.slice(5);
      }

      const deployParams = new DeployUtil.DeployParams(
        issuerPk,
        CASPER_CONFIG.CHAIN_NAME,
        1,
        1800000
      );

      const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(contractHash, 'hex')),
        'revoke',
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.REVOKE || 3_000_000_000
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
      
      setDeployHash(hash);

      setMessage({
        type: 'success',
        text: '✅ Credential revoked successfully!'
      });

      setAddressToRevoke('');
    } catch (e: any) {
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl mx-auto border border-gray-100">
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

      {/* Issuer Status */}
      {walletState.isConnected && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Issuer Status</h3>
            <button
              onClick={checkIssuerStatus}
              disabled={checkingIssuer}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {checkingIssuer ? 'Checking...' : 'Refresh'}
            </button>
          </div>
          
          <div className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center ${
            isIssuer 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isIssuer ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                You are the issuer - Can revoke credentials
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                You are NOT the issuer - Access denied
              </>
            )}
          </div>
        </div>
      )}

      {/* Revoke Form */}
      {walletState.isConnected && isIssuer && (
        <div className="space-y-5">
          {/* Warning Banner */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Warning: Permanent Action</h3>
                <p className="text-sm text-red-700">
                  Revoking a credential is permanent and cannot be undone. The user will lose access immediately.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Public Key to Revoke
            </label>
            <input
              type="text"
              value={addressToRevoke}
              onChange={(e) => setAddressToRevoke(e.target.value)}
              disabled={loading}
              placeholder="01a1b2c3d4e5f6... or 02a1b2c3d4e5f6..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the user's public key (starts with 01 or 02)
            </p>
          </div>

          <button
            onClick={handleRevoke}
            disabled={!addressToRevoke || loading}
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

      {/* Access Denied Message */}
      {walletState.isConnected && !isIssuer && !checkingIssuer && (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Access Restricted</h3>
          <p className="text-yellow-700 mb-4">
            Only the contract issuer can revoke credentials.
          </p>
          <div className="text-sm text-gray-600">
            <p>Connect with the issuer wallet to access admin functions.</p>
          </div>
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
      {walletState.isConnected && isIssuer && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">How to revoke:</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Ensure you're connected as the contract issuer</li>
            <li>Enter the user's public key (66 hex characters starting with 01 or 02)</li>
            <li>Click "Revoke Credential"</li>
            <li>Sign the transaction in your wallet</li>
            <li>Wait for blockchain confirmation (1-2 minutes)</li>
          </ol>
        </div>
      )}
    </div>
  );
}