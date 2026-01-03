'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CLPublicKey,
  RuntimeArgs,
  CLValueBuilder,
  DeployUtil,
  CLByteArray,
} from 'casper-js-sdk';
import { Copy, ExternalLink, CheckCircle, XCircle, Shield, Package } from 'lucide-react';

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

// Role resources mapping
const ROLE_RESOURCES = {
  admin: {
    name: 'Admin',
    color: 'purple',
    icon: '👑',
    resources: [
      { name: 'User Management', description: 'Full control over user accounts', icon: '👥' },
      { name: 'System Settings', description: 'Configure system parameters', icon: '⚙️' },
      { name: 'Audit Logs', description: 'View all system activities', icon: '📋' },
      { name: 'Role Assignment', description: 'Assign roles to users', icon: '🎯' }
    ]
  },
  developer: {
    name: 'Developer',
    color: 'blue',
    icon: '💻',
    resources: [
      { name: 'Code Repository', description: 'Access to source code', icon: '📁' },
      { name: 'API Access', description: 'Full API credentials', icon: '🔌' },
      { name: 'Deployment Console', description: 'Deploy to production', icon: '🚀' },
      { name: 'Testing Tools', description: 'Advanced testing suite', icon: '🧪' }
    ]
  },
  moderator: {
    name: 'Moderator',
    color: 'green',
    icon: '🛡️',
    resources: [
      { name: 'Content Review', description: 'Moderate user content', icon: '📝' },
      { name: 'User Reports', description: 'Handle user complaints', icon: '🚨' },
      { name: 'Community Analytics', description: 'View community stats', icon: '📊' },
      { name: 'Ban Management', description: 'Manage user bans', icon: '🔨' }
    ]
  },
  user: {
    name: 'User',
    color: 'gray',
    icon: '👤',
    resources: [
      { name: 'Profile Settings', description: 'Manage your profile', icon: '⚙️' },
      { name: 'Activity History', description: 'View your activities', icon: '📜' },
      { name: 'Basic Features', description: 'Core platform features', icon: '✨' },
      { name: 'Support Access', description: 'Contact support team', icon: '💬' }
    ]
  },
  verified: {
    name: 'Verified',
    color: 'yellow',
    icon: '✅',
    resources: [
      { name: 'Premium Content', description: 'Exclusive content access', icon: '💎' },
      { name: 'Early Access', description: 'Try new features first', icon: '🎁' },
      { name: 'VIP Support', description: 'Priority support ticket', icon: '👔' },
      { name: 'Exclusive Events', description: 'Members-only events', icon: '🎉' }
    ]
  }
};

export default function RoleResources() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
    details?: string;
  } | null>(null);
  const [walletState, setWalletState] = useState(walletManager.getState());
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
    setUserRole(null);
  }, []);

  async function checkMyRole() {
    try {
      setLoading(true);
      setDeployHash(null);
      setUserRole(null);
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

      const userPk = CLPublicKey.fromHex(freshState.publicKey);
      const userAddress = createOdraAddress(freshState.publicKey);

      const runtimeArgs = RuntimeArgs.fromMap({
        user: userAddress,
      });

      let contractHash = CASPER_CONFIG.CONTRACT_HASH;
      if (contractHash.startsWith('hash-')) {
        contractHash = contractHash.slice(5);
      }

      const deployParams = new DeployUtil.DeployParams(
        userPk,
        CASPER_CONFIG.CHAIN_NAME,
        1,
        1800000
      );

      const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(contractHash, 'hex')),
        'get_role',
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.GET_ROLE || 3_000_000_000
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

      // TODO: After transaction is confirmed, query the actual role from contract
      // For now, we'll show a success message
      // In production, you'd wait for the deploy to be processed and then query the result
      
      setMessage({
        type: 'success',
        text: '✅ Transaction submitted! Check explorer for results.'
      });

      // Simulate setting role (in real app, query after confirmation)
      // This is just for demo - you should query the contract state after deploy is executed
      setTimeout(() => {
        // Set a demo role - replace this with actual contract query
        setUserRole('developer');
      }, 2000);

    } catch (e: any) {
      console.error('Get role error:', e);

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

  const getRoleColorClasses = (color: string) => {
    switch (color) {
      case 'purple': return 'from-purple-500 to-purple-700';
      case 'blue': return 'from-blue-500 to-blue-700';
      case 'green': return 'from-green-500 to-green-700';
      case 'yellow': return 'from-yellow-500 to-yellow-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  const roleData = userRole ? ROLE_RESOURCES[userRole as keyof typeof ROLE_RESOURCES] : null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-6xl mx-auto border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">My Role & Resources</h2>

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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Click the button below to sign a transaction that retrieves your role and displays accessible resources.
            </p>
          </div>

          <button
            onClick={checkMyRole}
            disabled={loading}
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
                <Shield className="w-5 h-5 mr-2" />
                Check My Role
              </>
            )}
          </button>
        </div>
      )}

      {/* Role Information Card */}
      {roleData && (
        <div className="mt-6">
          <div className={`bg-gradient-to-r ${getRoleColorClasses(roleData.color)} p-6 rounded-xl text-white mb-4`}>
            <div className="flex items-center gap-4">
              <div className="text-6xl">{roleData.icon}</div>
              <div>
                <h3 className="text-2xl font-bold mb-1">{roleData.name} Role</h3>
                <p className="text-white/90">You have access to {roleData.resources.length} exclusive resources</p>
              </div>
            </div>
          </div>

          {/* Resource Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleData.resources.map((resource, index) => (
              <div
                key={index}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{resource.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{resource.name}</h4>
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  </div>
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </div>
            ))}
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