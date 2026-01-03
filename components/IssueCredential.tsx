'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CLPublicKey,
  RuntimeArgs,
  CLValueBuilder,
  DeployUtil,
  CLByteArray,
} from 'casper-js-sdk';
import { Copy, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

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

function getDeployHashAsHex(deploy: DeployUtil.Deploy): string {
  const deployHash = deploy.hash;
  return Buffer.from(deployHash).toString('hex');
}

export default function IssueCredential() {
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

  useEffect(() => {
    const unsubscribe = walletManager.subscribe((state) => {
      setWalletState(state);
    });

    walletManager.syncWithWallet().catch(console.error);

    return unsubscribe;
  }, []);

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

      const freshState = await walletManager.syncWithWallet();
      if (!freshState.publicKey) {
        throw new Error('Wallet disconnected during operation.');
      }

      const issuerPk = CLPublicKey.fromHex(freshState.publicKey);
      const userAddress = createOdraAddress(freshState.publicKey);

      const runtimeArgs = RuntimeArgs.fromMap({
        user: userAddress,
        role: CLValueBuilder.string(role),
        ttl_seconds: CLValueBuilder.u64(days * 24 * 60 * 60),
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
        'mint',
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.MINT || 5_000_000_000
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
        text: '✅ Credential issued successfully!'
      });

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
            </select>
          </div>

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
          </div>

          <button
            onClick={issueCredential}
            disabled={!role || loading}
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