"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, XCircle, Search, AlertCircle, CheckCircle, Wallet, FileText, ArrowLeft } from 'lucide-react';
import { walletManager } from '../../lib/wallet';
import { CASPER_CONFIG, ENTRY_POINTS } from '../../utils/constants';
import {
  CLPublicKey,
  RuntimeArgs,
  CLValueBuilder,
  DeployUtil,
} from 'casper-js-sdk';

export default function AdminPage() {
  const [credentialId, setCredentialId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
    details?: string;
  } | null>(null);
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [walletState, setWalletState] = useState(walletManager.getState());

  useEffect(() => {
    const unsubscribe = walletManager.subscribe(setWalletState);
    walletManager.syncWithWallet().catch(console.error);
    return unsubscribe;
  }, []);

  const revokeCredential = async () => {
    if (!credentialId.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter a credential ID'
      });
      return;
    }

    if (!reason.trim()) {
      setMessage({
        type: 'error',
        text: 'Please provide a reason for revocation'
      });
      return;
    }

    if (!walletState.publicKey) {
      setMessage({
        type: 'error',
        text: 'Wallet not connected',
        details: 'Please connect your Casper wallet first.'
      });
      return;
    }

    try {
      setLoading(true);
      setDeployHash(null);
      setMessage({
        type: 'info',
        text: '🔄 Preparing revocation transaction...'
      });

      // Prepare runtime args
      const runtimeArgs = RuntimeArgs.fromMap({
        'credential_id': CLValueBuilder.u256(credentialId),
        'reason': CLValueBuilder.string(reason)
      });

      // Get contract hash
      let contractHash = CASPER_CONFIG.CONTRACT_HASH;
      if (contractHash.startsWith('hash-')) {
        contractHash = contractHash.slice(5);
      }

      const callerPk = CLPublicKey.fromHex(walletState.publicKey);

      const deployParams = new DeployUtil.DeployParams(
        callerPk,
        CASPER_CONFIG.CHAIN_NAME,
        1,
        1800000
      );

      // Create session for revoke_credential entry point
      const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        Uint8Array.from(Buffer.from(contractHash, 'hex')),
        ENTRY_POINTS.REVOKE_CREDENTIAL,
        runtimeArgs
      );

      const payment = DeployUtil.standardPayment(
        CASPER_CONFIG.PAYMENT_AMOUNTS.REVOKE_CREDENTIAL
      );

      const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

      console.log('📋 Deploy prepared for revocation');

      // Sign deploy with wallet
      setMessage({
        type: 'info',
        text: '✍️ Please approve the transaction in your wallet...'
      });

      const signedDeploy = await walletManager.signDeploy(deploy);
      const signedDeployJson = DeployUtil.deployToJson(signedDeploy);

      console.log('✅ Deploy signed successfully');

      // Submit to blockchain via backend
      setMessage({
        type: 'info',
        text: '📡 Submitting to Casper blockchain...'
      });

      const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caspercrediq-6.onrender.com' || 'http://localhost:3001';
      const submitResponse = await fetch(`${BACKEND_API_URL}/api/deploy/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedDeploy: signedDeployJson })
      });

      const submitResult = await submitResponse.json();

      if (submitResult.success) {
        setDeployHash(submitResult.deployHash);

        console.log('✅ Revocation deploy submitted:', submitResult.deployHash);

        setMessage({
          type: 'success',
          text: `🎉 Credential ${credentialId} revoked successfully!`,
          details: `Transaction hash: ${submitResult.deployHash.slice(0, 16)}...`
        });

        // Clear form
        setCredentialId('');
        setReason('');
      } else {
        setMessage({
          type: 'error',
          text: '⚠️ Blockchain submission failed',
          details: submitResult.error || 'Unknown error occurred'
        });
      }

    } catch (error: any) {
      console.error('❌ Revocation error:', error);

      let errorText = 'Revocation failed';
      let errorDetails = error.message || 'Unknown error';

      if (error.message?.includes('User rejected')) {
        errorText = 'Transaction cancelled';
        errorDetails = 'You rejected the transaction in your wallet.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorText = 'Backend connection failed';
        errorDetails = 'Cannot connect to backend server.';
      }

      setMessage({
        type: 'error',
        text: errorText,
        details: errorDetails
      });
    } finally {
      setLoading(false);
    }
  };

  const openExplorer = (hash: string) => {
    const explorerUrl = CASPER_CONFIG.NETWORK?.EXPLORER_URL || 'https://testnet.cspr.live';
    window.open(`${explorerUrl}/deploy/${hash}`, '_blank');
  };

  return (
    <div className="max-h-screen p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto ">
        {/* Header */}
        <div className="relative text-center mb-4 pt-4">
          <Link
            href="/dashboard"
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 hover:bg-white/50 rounded-full transition-colors text-gray-600 hover:text-gray-900"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
    
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Revoke Credential
          </h1>
     
          {/* Access Level Note */}
          <div className="mt-2 inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <p className="text-xs text-amber-800">
              <strong>Access Required:</strong> Only credential issuers (Level 2+) and contract owner (Level 4) can revoke credentials
            </p>
          </div>
        </div>



        {/* Revocation Form */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Revoke Credential
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credential ID (Numeric)
              </label>
              <input
                type="number"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="e.g., 0"
                disabled={loading}
                min="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
              />
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p className="font-medium text-blue-800 mb-1">💡 How to find the Credential ID:</p>
                <ul className="text-blue-700 space-y-0.5 ml-4 list-disc">
                  <li>The numeric ID starts at <strong>0</strong> and increments (0, 1, 2, 3...)</li>
                  <li>Check the <strong>issue page</strong> - the ID is shown after issuing</li>
                  <li>Look at the <strong>blockchain explorer</strong> in the deploy transaction</li>
                  <li>First credential issued = ID 0, second = ID 1, etc.</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Revocation
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Credential compromised, Employee terminated, etc."
                disabled={loading}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 resize-none"
              />
            </div>

            <button
              onClick={revokeCredential}
              disabled={loading || !walletState.isConnected}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Revoking...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Revoke Credential
                </>
              )}
            </button>

            <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
              <p className="font-medium mb-1">⚠️ Warning:</p>
              <p>Revoking a credential is permanent and cannot be undone.</p>
              <p className="mt-1.5">
                <strong>Cost:</strong> {CASPER_CONFIG.PAYMENT_AMOUNTS.REVOKE_CREDENTIAL / 1000000000} CSPR
              </p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg shadow-lg p-6 mb-6 ${
            message.type === 'success' ? 'bg-green-50 border-2 border-green-200' :
            message.type === 'error' ? 'bg-red-50 border-2 border-red-200' :
            message.type === 'warning' ? 'bg-yellow-50 border-2 border-yellow-200' :
            'bg-blue-50 border-2 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" /> :
               message.type === 'error' ? <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" /> :
               message.type === 'warning' ? <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" /> :
               <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />}
              <div className="flex-1">
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

        {/* Deploy Hash Result */}
        {deployHash && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Revocation Successful
            </h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-800 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Transaction Hash
                </span>
                <button
                  onClick={() => openExplorer(deployHash)}
                  className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 bg-purple-100 rounded flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  View in Explorer
                </button>
              </div>
              <p className="text-xs font-mono text-purple-700 bg-purple-100 p-2 rounded break-all">
                {deployHash}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}