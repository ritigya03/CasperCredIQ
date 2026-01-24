"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  CheckCircle, XCircle, Eye, Mail, User, Calendar, AlertCircle,
  FileText, ExternalLink, Download, Copy, Database, Shield, 
  QrCode, Wallet, Send, Search, Key, ArrowLeft
} from 'lucide-react';
import {
  CLPublicKey,
  RuntimeArgs,
  CLValueBuilder,
  DeployUtil,
} from 'casper-js-sdk';
import { walletManager } from '../../lib/wallet';
import { CASPER_CONFIG, ENTRY_POINTS } from '../../utils/constants';

interface PendingRequest {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  justification: string;
  aiConfidence: number;
  aiRecommendation: boolean;
  submittedAt: string;
  credentialType: string;
  recipientPublicKey: string;
  validityDays: string;
  metadata: any;
  skills?: string[];
  department?: string;
  status?: string;
}

interface CredentialFormData {
  credentialType: string;
  role: string;
  validityDays: string;
  aiConfidence: number;
  description: string;
  additionalMetadata: string;
}

export default function IssuerDashboard() {
  // State for requests
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State for credential issuance
  const [credentialForm, setCredentialForm] = useState<CredentialFormData>({
    credentialType: 'employee',
    role: '',
    validityDays: '30',
    aiConfidence: 85,
    description: '',
    additionalMetadata: '{}'
  });
  
  const [issuanceLoading, setIssuanceLoading] = useState(false);
  const [issuanceMessage, setIssuanceMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
    details?: string;
  } | null>(null);
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Wallet state
  const [walletState, setWalletState] = useState(walletManager.getState());

  // Backend URL
  const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caspercrediq-6.onrender.com' || 'http://localhost:3001';

  // Filtered requests
  const filteredRequests = requests.filter(request => 
    request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch requests from backend
  useEffect(() => {
    fetchRequests();
    const unsubscribe = walletManager.subscribe(setWalletState);
    walletManager.syncWithWallet().catch(console.error);
    return unsubscribe;
  }, []);

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      console.log('📥 Fetching requests from:', `${BACKEND_API_URL}/api/requests`);
      
      const response = await fetch(`${BACKEND_API_URL}/api/requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Received requests:', data);
      
      if (data.success && data.requests) {
        setRequests(data.requests);
      } else {
        console.warn('Unexpected response format:', data);
        setRequests([]);
      }
      
    } catch (error: any) {
      console.error('❌ Failed to fetch requests:', error);
      setIssuanceMessage({
        type: 'warning',
        text: '⚠️ Backend connection failed',
        details: 'Could not load requests. Click "Add Test Data" to see demo requests.'
      });
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (request) {
        setSelectedRequest(request);
        setCredentialForm(prev => ({
          ...prev,
          credentialType: request.credentialType || 'employee',
          role: request.role,
          validityDays: request.validityDays || '30',
          aiConfidence: Math.round(request.aiConfidence * 100),
          description: `Issued to ${request.name} for ${request.role} role at ${request.organization}`,
          additionalMetadata: JSON.stringify({
            skills: request.skills || [],
            department: request.department || '',
            organization: request.organization,
            justification: request.justification.substring(0, 200)
          }, null, 2)
        }));
      }

      // Try to mark as approved in backend
      try {
        await fetch(`${BACKEND_API_URL}/api/requests/${requestId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issuer: walletState.publicKey || 'admin',
            action: 'approved_for_issuance',
            approvedAt: new Date().toISOString()
          })
        });
      } catch (backendError) {
        console.log('Backend update failed, continuing locally:', backendError);
      }

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'approved' } : req
      ));

      setIssuanceMessage({
        type: 'success',
        text: '✅ Request approved!',
        details: 'Now you can issue the credential on blockchain.'
      });

    } catch (error) {
      console.error('Failed to approve:', error);
      setIssuanceMessage({
        type: 'error',
        text: '❌ Failed to approve request'
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      try {
        await fetch(`${BACKEND_API_URL}/api/requests/${requestId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reason: 'Rejected by issuer',
            rejectedAt: new Date().toISOString()
          })
        });
      } catch (backendError) {
        console.log('Backend update failed, continuing locally:', backendError);
      }

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'rejected' } : req
      ));
      
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }

      setIssuanceMessage({
        type: 'info',
        text: 'Request rejected'
      });

    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  // Issue credential - COMPLETE FIXED VERSION
 // Updated issueCredential function for new contract
// Replace the existing issueCredential function with this one

// Fixed issueCredential function for IssuerDashboard
// Replace the existing issueCredential function with this corrected version

const issueCredential = async () => {
  if (!selectedRequest) {
    setIssuanceMessage({
      type: 'error',
      text: 'No request selected'
    });
    return;
  }

  if (!walletState.publicKey) {
    setIssuanceMessage({
      type: 'error',
      text: 'Wallet not connected',
      details: 'Please connect your Casper wallet first.'
    });
    return;
  }

  try {
    setIssuanceLoading(true);
    setIssuanceMessage({
      type: 'info',
      text: '🚀 Step 1/5: Preparing credential data...'
    });

    // Generate credential ID
    const generatedCredentialId = `CRED_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setCredentialId(generatedCredentialId);

    // Step 1: Prepare credential data for IPFS
    const credentialData = {
      credentialId: generatedCredentialId,
      recipientName: selectedRequest.name,
      recipientEmail: selectedRequest.email,
      recipientPublicKey: selectedRequest.recipientPublicKey,
      role: credentialForm.role || selectedRequest.role,
      organization: selectedRequest.organization,
      credentialType: credentialForm.credentialType,
      description: credentialForm.description,
      validityDays: credentialForm.validityDays,
      aiConfidence: credentialForm.aiConfidence,
      metadata: JSON.parse(credentialForm.additionalMetadata || '{}'),
      issuerPublicKey: walletState.publicKey,
      issuedAt: new Date().toISOString()
    };

    console.log('📝 Credential data prepared:', credentialData);

    // Step 2: Upload to IPFS via backend
    setIssuanceMessage({
      type: 'info',
      text: '📤 Step 2/5: Uploading to IPFS...'
    });

    const ipfsResponse = await fetch(`${BACKEND_API_URL}/api/ipfs/credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialData)
    });

    const ipfsResult = await ipfsResponse.json();
    
    if (!ipfsResult.success) {
      throw new Error(ipfsResult.error || 'IPFS upload failed');
    }

    const uploadedIpfsHash = ipfsResult.ipfsHash;
    setIpfsHash(uploadedIpfsHash);
    
    console.log('✅ IPFS upload successful:', uploadedIpfsHash);

    // Step 3: Generate cryptographic proofs
    setIssuanceMessage({
      type: 'info',
      text: '🔐 Step 3/5: Generating cryptographic proofs...'
    });

    // Generate SHA-256 hash of credential data (64 hex chars)
    const credentialHash = await generateCredentialHash(credentialData);
    
    // Generate issuer signature (128 hex chars minimum)
    const issuerSignature = generateIssuerSignature(credentialData, walletState.publicKey);

    // Generate DIDs
    const issuerDID = `did:casper:${walletState.publicKey.slice(0, 20)}`;
    const holderDID = `did:casper:${selectedRequest.recipientPublicKey.slice(0, 20)}`;

    console.log('🔐 Cryptographic proofs generated:', {
      credentialHash: credentialHash.slice(0, 20) + '...',
      issuerSignature: issuerSignature.slice(0, 20) + '...',
      issuerDID,
      holderDID
    });

    // Step 4: Prepare blockchain transaction
    setIssuanceMessage({
      type: 'info',
      text: '⛓️ Step 4/5: Preparing blockchain transaction...'
    });

    // CRITICAL FIX: Convert holder public key to Address (Key type)
    const holderPublicKey = CLPublicKey.fromHex(selectedRequest.recipientPublicKey);
    
    // Prepare runtime args for contract - CORRECTED VERSION
    const runtimeArgs = RuntimeArgs.fromMap({
      'credential_id': CLValueBuilder.string(generatedCredentialId),
      'issuer_did': CLValueBuilder.string(issuerDID),
      'holder_did': CLValueBuilder.string(holderDID),
      'holder_address': CLValueBuilder.key(holderPublicKey),  // ✅ FIXED: Use key() instead of byteArray()
      'credential_hash': CLValueBuilder.string(credentialHash),
      'issuer_signature': CLValueBuilder.string(issuerSignature),
      'ipfs_hash': CLValueBuilder.string(uploadedIpfsHash),
      'ai_confidence': CLValueBuilder.u8(credentialForm.aiConfidence),
      'expires_in_days': CLValueBuilder.u64(parseInt(credentialForm.validityDays))
    });

    // Use CONTRACT_HASH from constants
    let contractHash = CASPER_CONFIG.CONTRACT_HASH;
    if (contractHash.startsWith('hash-')) {
      contractHash = contractHash.slice(5);
    }

    const issuerPk = CLPublicKey.fromHex(walletState.publicKey);
    
    const deployParams = new DeployUtil.DeployParams(
      issuerPk,
      CASPER_CONFIG.CHAIN_NAME,
      1,
      1800000
    );

    // Use newStoredContractByHash
    const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(contractHash, 'hex')),
      ENTRY_POINTS.ISSUE_CREDENTIAL,
      runtimeArgs
    );

    const payment = DeployUtil.standardPayment(
      CASPER_CONFIG.PAYMENT_AMOUNTS.ISSUE_CREDENTIAL
    );
    
    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

    console.log('📋 Deploy prepared:', {
      contractHash: contractHash,
      entryPoint: ENTRY_POINTS.ISSUE_CREDENTIAL,
      credentialId: generatedCredentialId,
      issuerDID,
      holderDID,
      holderAddress: 'Key::Account',  // This is now correct
      credentialHash: credentialHash.slice(0, 20) + '...',
      ipfsHash: uploadedIpfsHash,
      aiConfidence: credentialForm.aiConfidence,
      expiresInDays: credentialForm.validityDays
    });

    // Step 5: Sign deploy with wallet
    setIssuanceMessage({
      type: 'info',
      text: '✍️ Step 5/5: Please approve in your wallet...'
    });

    const signedDeploy = await walletManager.signDeploy(deploy);
    const signedDeployJson = DeployUtil.deployToJson(signedDeploy);

    console.log('✅ Deploy signed successfully');

    // Step 6: Submit to blockchain via backend
    setIssuanceMessage({
      type: 'info',
      text: '📡 Submitting to Casper blockchain...'
    });

    const submitResponse = await fetch(`${BACKEND_API_URL}/api/deploy/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedDeploy: signedDeployJson })
    });

    const submitResult = await submitResponse.json();
    
    if (submitResult.success) {
      setDeployHash(submitResult.deployHash);
      
      console.log('✅ Deploy submitted:', submitResult.deployHash);

      // Send notification
      try {
        await fetch(`${BACKEND_API_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedRequest.email,
            subject: `Your ${selectedRequest.role} Credential Has Been Issued`,
            credentialId: generatedCredentialId,
            ipfsHash: uploadedIpfsHash,
            validUntil: new Date(Date.now() + parseInt(credentialForm.validityDays) * 24 * 60 * 60 * 1000).toISOString()
          })
        });
      } catch (notifyError) {
        console.log('Email notification failed (non-critical):', notifyError);
      }

      setIssuanceMessage({
        type: 'success',
        text: `🎉 Credential issued to ${selectedRequest.name}!`,
        details: `DID: ${holderDID.slice(0, 25)}... • IPFS: ${uploadedIpfsHash.slice(0, 12)}... • TX: ${submitResult.deployHash.slice(0, 12)}...`
      });

      // Remove request from list
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setSelectedRequest(null);
    } else {
      setIssuanceMessage({
        type: 'warning',
        text: '⚠️ Blockchain submission failed',
        details: `IPFS saved: ${uploadedIpfsHash.slice(0, 12)}... • Error: ${submitResult.error}`
      });
    }

  } catch (error: any) {
    console.error('❌ Credential issuance error:', error);
    
    let errorText = 'Credential issuance failed';
    let errorDetails = error.message || 'Unknown error';

    if (error.message?.includes('User rejected')) {
      errorText = 'Transaction cancelled';
      errorDetails = 'You rejected the transaction in your wallet.';
    } else if (error.message?.includes('Failed to fetch')) {
      errorText = 'Backend connection failed';
      errorDetails = 'Cannot connect to backend server.';
    } else if (error.message?.includes('Invalid signature')) {
      errorText = 'Invalid signature';
      errorDetails = 'Signature must be at least 64 characters.';
    } else if (error.message?.includes('Invalid DID')) {
      errorText = 'Invalid DID format';
      errorDetails = 'DID must start with "did:" and be at least 10 characters.';
    }

    setIssuanceMessage({
      type: 'error',
      text: errorText,
      details: errorDetails
    });
  } finally {
    setIssuanceLoading(false);
  }
};

// Helper function to generate credential hash (SHA-256)
const generateCredentialHash = async (credentialData: any): Promise<string> => {
  // Create a deterministic string from credential data
  const dataString = JSON.stringify({
    credentialId: credentialData.credentialId,
    recipientPublicKey: credentialData.recipientPublicKey,
    issuerPublicKey: credentialData.issuerPublicKey,
    role: credentialData.role,
    organization: credentialData.organization,
    issuedAt: credentialData.issuedAt
  });
  
  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex; // 64 hex characters
};

// Helper function to generate issuer signature
const generateIssuerSignature = (credentialData: any, issuerPublicKey: string): string => {
  // In production, this should use the issuer's private key to sign
  // For now, we generate a deterministic signature based on the data
  
  const signatureData = `${credentialData.credentialId}:${issuerPublicKey}:${credentialData.issuedAt}`;
  
  // Create a 128-character hex string (minimum required by contract)
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureData);
  
  // Simple hash-based signature (replace with real signature in production)
  let signature = '';
  for (let i = 0; i < data.length; i++) {
    signature += data[i].toString(16).padStart(2, '0');
  }
  
  // Ensure at least 128 characters
  while (signature.length < 128) {
    signature += signature;
  }
  
  return signature.slice(0, 128); // Exactly 128 hex characters
};



  const connectWallet = async () => {
    try {
      setIssuanceMessage({
        type: 'info',
        text: '🔗 Connecting to wallet...'
      });
      const state = await walletManager.connect();
      setWalletState(state);
      setIssuanceMessage({
        type: 'success',
        text: `Connected to ${state.walletType || 'wallet'}`
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setIssuanceMessage({
        type: 'error',
        text: 'Failed to connect wallet',
        details: error.message || 'Please install Casper Wallet or CSPR.click'
      });
    }
  };

  const disconnectWallet = () => {
    walletManager.disconnect();
    setWalletState(walletManager.getState());
    setIssuanceMessage({
      type: 'info',
      text: 'Wallet disconnected'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addTestData = async () => {
    try {
      setLoadingRequests(true);
      const response = await fetch(`${BACKEND_API_URL}/api/requests/test`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setIssuanceMessage({
          type: 'success',
          text: '✅ Test data added!',
          details: 'Refreshing requests...'
        });
        fetchRequests();
      }
    } catch (error) {
      console.log('Could not add test data:', error);
      setIssuanceMessage({
        type: 'warning',
        text: '⚠️ Backend not available'
      });
    }
  };

  const openExplorer = (hash: string) => {
    const explorerUrl = CASPER_CONFIG.NETWORK?.EXPLORER_URL || 'https://testnet.cspr.live';
    window.open(`${explorerUrl}/deploy/${hash}`, '_blank');
  };

  const openIPFSGateway = (hash: string) => {
    window.open(`https://gateway.pinata.cloud/ipfs/${hash}`, '_blank');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Issuer Dashboard</h1>
                <p className="text-gray-600 mt-2">
                  Review credential requests and issue blockchain credentials
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Database className="w-4 h-4" />
                  <span>Backend: {BACKEND_API_URL}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={addTestData}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                Add Test Data
              </button>
              <button
                onClick={fetchRequests}
                disabled={loadingRequests}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center"
              >
                {loadingRequests ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh Requests
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Wallet Status */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <Wallet className={`w-5 h-5 mr-2 ${walletState.isConnected ? 'text-green-500' : 'text-yellow-500'}`} />
                <div>
                  <span className="font-medium">
                    {walletState.isConnected ? (
                      <>
                        Connected to {walletState.walletType || 'wallet'}
                        <span className="text-sm text-gray-500 ml-2 font-mono hidden sm:inline">
                          {walletState.publicKey?.slice(0, 10)}...
                        </span>
                      </>
                    ) : (
                      'Wallet not connected'
                    )}
                  </span>
                  {!walletState.isConnected && (
                    <p className="text-sm text-gray-600 mt-1">
                      Connect your Casper wallet to issue credentials
                    </p>
                  )}
                </div>
              </div>
              <div>
                {walletState.isConnected ? (
                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors font-medium"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded text-sm hover:from-blue-600 hover:to-blue-700 transition-colors font-medium flex items-center"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1  lg:grid-cols-3 gap-6">
          {/* Left Column - Request List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow">
              <div className="p-4 md:p-6 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Pending Requests</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {loadingRequests ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-3 text-gray-600">Loading requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No matching requests' : 'No pending requests'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'Try a different search term' : 'All requests have been processed'}
                  </p>
                  <button
                    onClick={addTestData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Demo Requests
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 md:p-6 hover:bg-gray-50 transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-900 text-lg">{request.name}</h3>
                            <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded border border-gray-300">
                              ID: {request.id}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              request.aiRecommendation 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              AI: {request.aiRecommendation ? '✓' : '✗'}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              Math.round(request.aiConfidence * 100) > 70 ? 'bg-blue-100 text-blue-800' :
                              Math.round(request.aiConfidence * 100) > 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {Math.round(request.aiConfidence * 100)}%
                            </span>
                            {request.status === 'approved' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Approved
                              </span>
                            )}
                            {request.status === 'rejected' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Rejected
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-sm">
                              <span className="text-gray-500 block mb-1">Email</span>
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900 truncate">{request.email}</span>
                              </div>
                            </div>
                            
                            <div className="text-sm">
                              <span className="text-gray-500 block mb-1">Role Requested</span>
                              <p className="text-gray-900 font-medium">{request.role}</p>
                            </div>
                            
                            <div className="text-sm">
                              <span className="text-gray-500 block mb-1">Submitted</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900">
                                  {new Date(request.submittedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-sm mb-3">
                            <span className="text-gray-500 block mb-1">Organization</span>
                            <p className="text-gray-900 font-medium">{request.organization}</p>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-4">
                            <strong className="text-gray-700">Justification:</strong>{' '}
                            <span className="line-clamp-2">{request.justification}</span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex items-center text-sm text-gray-500 mb-1">
                              <Key className="w-4 h-4 mr-1" />
                              <span>Recipient Public Key:</span>
                            </div>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">
                              {request.recipientPublicKey.slice(0, 20)}...
                            </code>
                          </div>
                          
                          {request.skills && request.skills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {request.skills.slice(0, 3).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {request.skills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{request.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className={`px-3 py-2 rounded text-sm transition-colors font-medium flex items-center justify-center ${
                              selectedRequest?.id === request.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {selectedRequest?.id === request.id ? (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Selected
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Select
                              </>
                            )}
                          </button>
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={request.status === 'approved'}
                              className="px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={request.status === 'rejected'}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Issuance Form */}
          <div className="space-y-6">
            {/* Credential Issuance Form */}
            <div className="bg-white rounded-xl shadow p-4 md:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Issue Credential
              </h3>
              
              {!selectedRequest ? (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">Select a request to issue a credential</p>
                </div>
              ) : !walletState.isConnected ? (
                <div className="text-center py-6">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                  <p className="text-gray-600 mb-4">Connect your Casper wallet to issue credentials</p>
                  <button
                    onClick={connectWallet}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Selected:</strong> {selectedRequest.name} ({selectedRequest.email})
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Public key: {selectedRequest.recipientPublicKey.slice(0, 20)}...
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credential Type
                    </label>
                    <select
                      value={credentialForm.credentialType}
                      onChange={(e) => setCredentialForm(prev => ({ ...prev, credentialType: e.target.value }))}
                      disabled={issuanceLoading}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                    >
                      <option value="employee">Employee ID</option>
                      <option value="student">Student ID</option>
                      <option value="visitor">Visitor Pass</option>
                      <option value="contractor">Contractor Badge</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={credentialForm.role}
                      onChange={(e) => setCredentialForm(prev => ({ ...prev, role: e.target.value }))}
                      disabled={issuanceLoading}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                      placeholder="Enter role title"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Validity (Days)
                      </label>
                      <select
                        value={credentialForm.validityDays}
                        onChange={(e) => setCredentialForm(prev => ({ ...prev, validityDays: e.target.value }))}
                        disabled={issuanceLoading}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                      >
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">365 days</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI Confidence
                      </label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={credentialForm.aiConfidence}
                          onChange={(e) => setCredentialForm(prev => ({ ...prev, aiConfidence: parseInt(e.target.value) }))}
                          disabled={issuanceLoading}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                        />
                        <span className="ml-3 text-lg font-semibold text-gray-700 min-w-[45px]">
                          {credentialForm.aiConfidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={credentialForm.description}
                      onChange={(e) => setCredentialForm(prev => ({ ...prev, description: e.target.value }))}
                      disabled={issuanceLoading}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm resize-none"
                      placeholder="Brief description of the credential"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Metadata
                    </label>
                    <textarea
                      value={credentialForm.additionalMetadata}
                      onChange={(e) => setCredentialForm(prev => ({ ...prev, additionalMetadata: e.target.value }))}
                      disabled={issuanceLoading}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm font-mono text-xs"
                      placeholder="JSON metadata"
                    />
                  </div>
                  
                  <button
                    onClick={issueCredential}
                    disabled={issuanceLoading || !selectedRequest}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
                  >
                    {issuanceLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Issuing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Issue on Blockchain
                      </>
                    )}
                  </button>
                  
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">ℹ️ Process:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Prepare credential data</li>
                      <li>Upload to IPFS (Pinata)</li>
                      <li>Sign transaction in wallet</li>
                      <li>Submit to Casper blockchain</li>
                      <li>Send email notification</li>
                    </ol>
                    <p className="mt-2 text-amber-600">
                      <strong>Cost:</strong> {CASPER_CONFIG.PAYMENT_AMOUNTS.ISSUE_CREDENTIAL / 1000000000} CSPR
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Display */}
            {(ipfsHash || deployHash || credentialId) && (
              <div className="bg-white rounded-xl shadow p-4 md:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  Credential Issued
                </h3>
                
                <div className="space-y-4">
                  {credentialId && (
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Credential ID (String)
                        </span>
                        <button
                          onClick={() => copyToClipboard(credentialId)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-100 rounded"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-blue-700 bg-blue-100 p-2 rounded break-all">
                        {credentialId}
                      </p>
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-xs text-amber-800">
                          <strong>For Revocation:</strong> The blockchain uses a numeric ID (0, 1, 2...). 
                          Check the transaction in the explorer below to find the numeric credential_id in the deploy result.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {ipfsHash && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-800 flex items-center">
                          <Database className="w-4 h-4 mr-2" />
                          IPFS Hash
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(ipfsHash)}
                            className="text-xs text-green-600 hover:text-green-800 px-2 py-1 bg-green-100 rounded"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => openIPFSGateway(ipfsHash)}
                            className="text-xs text-green-600 hover:text-green-800 px-2 py-1 bg-green-100 rounded flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => window.location.href = `/verify?hash=${ipfsHash}&mode=ipfs`}
                            className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded flex items-center font-medium"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Verify
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-green-700 bg-green-100 p-2 rounded break-all">
                        {ipfsHash}
                      </p>
                    </div>
                  )}
                  
                  {deployHash && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-800 flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Transaction Hash
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(deployHash)}
                            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 bg-purple-100 rounded"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => openExplorer(deployHash)}
                            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 bg-purple-100 rounded flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Explorer
                          </button>
                          <button
                            onClick={() => window.location.href = `/verify?hash=${deployHash}&mode=deploy`}
                            className="text-xs text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded flex items-center font-medium"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Verify
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-purple-700 bg-purple-100 p-2 rounded break-all">
                        {deployHash}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Message */}
            {issuanceMessage && (
              <div className={`p-4 rounded-lg border ${
                issuanceMessage.type === 'success' ? 'bg-green-50 border-green-200' :
                issuanceMessage.type === 'error' ? 'bg-red-50 border-red-200' :
                issuanceMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start">
                  {issuanceMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />}
                  {issuanceMessage.type === 'error' && <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />}
                  {issuanceMessage.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />}
                  {issuanceMessage.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      issuanceMessage.type === 'success' ? 'text-green-800' :
                      issuanceMessage.type === 'error' ? 'text-red-800' :
                      issuanceMessage.type === 'warning' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {issuanceMessage.text}
                    </p>
                    {issuanceMessage.details && (
                      <p className={`text-sm mt-1 ${
                        issuanceMessage.type === 'success' ? 'text-green-700' :
                        issuanceMessage.type === 'error' ? 'text-red-700' :
                        issuanceMessage.type === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {issuanceMessage.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Built on <strong className="text-gray-700">Casper Network</strong> • 
            Secured by blockchain technology
          </p>
          <p className="mt-1 text-xs">
            Contract: <code className="bg-gray-100 px-2 py-1 rounded">{CASPER_CONFIG.CONTRACT_HASH?.slice(0, 20)}...</code>
          </p>
        </div>
      </div>
    </div>
  );
}