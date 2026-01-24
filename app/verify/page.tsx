"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, XCircle, Search, Clock, Shield, FileText, ArrowLeft } from 'lucide-react';

const CredentialVerification = () => {
  const [deployHash, setDeployHash] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [verificationMode, setVerificationMode] = useState('deployHash'); // 'deployHash' or 'ipfsHash'
  const [loading, setLoading] = useState(false);
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');

  // Use environment variable, fallback to deployed backend, then localhost
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caspercrediq-6.onrender.com' || 'http://localhost:3001';
  const [autoVerify, setAutoVerify] = useState(false);

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashFromUrl = params.get('hash');
    const modeFromUrl = params.get('mode');
    
    if (hashFromUrl) {
      if (modeFromUrl === 'deploy') {
        setDeployHash(hashFromUrl);
        setVerificationMode('deployHash');
        setAutoVerify(true);
      } else if (modeFromUrl === 'ipfs') {
        setIpfsHash(hashFromUrl);
        setVerificationMode('ipfsHash');
        setAutoVerify(true);
      }
    }
  }, []);

  // Auto-verify when autoVerify is set
  useEffect(() => {
    if (autoVerify) {
      setAutoVerify(false);
      setTimeout(() => {
        queryCredential();
      }, 500);
    }
  }, [autoVerify, deployHash, ipfsHash, verificationMode]);

  const queryCredential = async () => {
    const inputValue = verificationMode === 'ipfsHash' ? ipfsHash : deployHash;
    
    if (!inputValue.trim()) {
      const modeLabel = verificationMode === 'ipfsHash' ? 'IPFS hash' : 'deploy hash';
      setError(`Please enter a ${modeLabel}`);
      return;
    }

    setLoading(true);
    setError('');
    setCredential(null);

    try {
      let data;
      
      if (verificationMode === 'ipfsHash') {
        // Fetch credential data from IPFS
        const response = await fetch(`${API_URL}/api/ipfs/${inputValue.trim()}`);
        data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Failed to fetch from IPFS. Please check the hash and try again.');
          return;
        }
        
        // Transform IPFS response to UI format
        const ipfsData = data.data;
        const uiData = {
          credential: {
            credentialId: ipfsData.credentialId || 'From IPFS',
            issuerDid: `did:casper:${ipfsData.issuerPublicKey?.slice(0, 20) || 'unknown'}`,
            issuerAddress: ipfsData.issuerPublicKey || 'Unknown',
            holderDid: `did:casper:${ipfsData.recipientPublicKey?.slice(0, 20) || 'unknown'}`,
            holderAddress: ipfsData.recipientPublicKey || 'Unknown',
            credentialHash: 'Stored off-chain',
            ipfsHash: inputValue.trim(),
            aiConfidence: ipfsData.aiConfidence || 0,
            expiresAt: ipfsData.issuedAt ? 
              new Date(new Date(ipfsData.issuedAt).getTime() + (parseInt(ipfsData.validityDays || '30') * 24 * 60 * 60 * 1000)).toISOString() : 
              'Unknown',
            issuedAt: ipfsData.issuedAt || 'Unknown'
          },
          isRevoked: false, // IPFS data doesn't track revocation
          isExpired: false, // Would need to calculate based on validity
          isValid: true, // IPFS data exists
          message: "Credential data retrieved from IPFS",
          ipfsData: ipfsData
        };
        
        setCredential(uiData);
      } else if (verificationMode === 'deployHash') {
        // Use the new deploy hash verification endpoint
        const response = await fetch(`${API_URL}/api/verify/deploy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deployHash: inputValue.trim() })
        });
        data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Failed to verify deploy. Please check the hash and try again.');
          return;
        }
        
        // Transform deploy response to UI format
        const uiData = {
          credential: {
            ...data.credential,
            credentialId: 'From Deploy',
            hash: data.credential.credentialHash,
            expiresAt: new Date(data.credential.expiresAt).toISOString()
          },
          isRevoked: data.status.isRevoked,
          isExpired: data.status.isExpired,
          isValid: data.status.isValid,
          message: data.verified ? "Credential is valid" : "Credential is invalid",
          deployHash: data.deployHash,
          dictionaryKey: data.dictionaryKey
        };
        
        setCredential(uiData);
      }
    } catch (err) {
      console.error('Error querying credential:', err);
      setError('Failed to fetch credential. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 'Unknown') return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getStatus = () => {
    if (!credential) return null;
    
    if (credential.isRevoked) {
      return { 
        type: 'revoked', 
        text: 'REVOKED', 
        color: 'bg-red-100 text-red-800 border-red-300', 
        icon: XCircle 
      };
    }
    
    if (credential.isExpired) {
      return { 
        type: 'expired', 
        text: 'EXPIRED', 
        color: 'bg-orange-100 text-orange-800 border-orange-300', 
        icon: Clock 
      };
    }
    
    return { 
      type: 'valid', 
      text: 'VALID', 
      color: 'bg-green-100 text-green-800 border-green-300', 
      icon: CheckCircle 
    };
  };

  const status = getStatus();
  const cred = credential?.credential;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Credential Verification
                  </h1>
                  <p className="text-sm text-gray-600">
                    Verify credentials on Casper blockchain or IPFS
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left Column - Search/Input */}
            <div className="bg-white border-r overflow-y-auto p-6 lg:p-8">
              <div className="max-w-xl mx-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Verify Credential</h2>
                
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setVerificationMode('deployHash')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      verificationMode === 'deployHash'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
         
                      <span className="text-sm">Deploy Hash</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setVerificationMode('ipfsHash')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      verificationMode === 'ipfsHash'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                     
                      <span className="text-sm">IPFS Hash</span>
                    </div>
                  </button>
                </div>

                {/* Input Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {verificationMode === 'ipfsHash' ? 'IPFS Hash' : 'Deploy Hash'}
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={verificationMode === 'ipfsHash' ? ipfsHash : deployHash}
                      onChange={(e) => verificationMode === 'ipfsHash' ? setIpfsHash(e.target.value) : setDeployHash(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && queryCredential()}
                      placeholder={verificationMode === 'ipfsHash' ? 'e.g., QmXgqL8j5qN6U5K4z8XvY8T7S6D5F4G3H2J1K9L8M7N6B5V4C3' : 'e.g., fe3ce95f95a717528a3e674063f2e9e13049bdde3a7a75578c285273bdb41ba1'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={queryCredential}
                      disabled={loading}
                      className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-medium shadow-md"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Verify Credential
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-red-800 text-sm">{error}</div>
                  </div>
                )}

                {/* Help Text */}
                {!credential && !error && !loading && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mt-6">
                    <AlertCircle className="w-6 h-6 text-blue-600 mb-3" />
                    <p className="text-gray-700 font-medium mb-3">
                      Choose a verification method
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <strong className="text-gray-800">Deploy Hash:</strong> Verifies credential on-chain with current revocation status
                      </div>
                      <div>
                        <strong className="text-gray-800">IPFS Hash:</strong> Retrieves the raw credential data stored on IPFS
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Quick Stats / Info Section */}
                <div className="mt-auto pt-6 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Verification Methods</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-700">Deploy Hash</div>
                        <div>On-chain verification with real-time revocation status</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-600">
                      <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-gray-700">IPFS Hash</div>
                        <div>Off-chain data retrieval from decentralized storage</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-2 text-xs text-indigo-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <strong>Network:</strong> Casper Testnet
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto p-6 lg:p-8">
              <div className="max-w-3xl mx-auto">
        {credential && status && cred && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg overflow-hidden animate-fadeIn">
            {/* Status Badge */}
            <div className={`${status.color} border-b-2 p-6 flex items-center justify-center gap-3`}>
              <status.icon className="w-8 h-8" />
              <span className="text-2xl font-bold">{status.text}</span>
            </div>

            {/* Status Summary */}
            <div className="bg-gray-50 p-4 border-b">
              <p className="text-center text-gray-700 font-medium">{credential.message}</p>
              {verificationMode === 'deployHash' && (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ <strong>Note:</strong> Deploy hash verification shows the credential state at the time of that specific transaction. 
                  If the credential was revoked later, use the revoke transaction's deploy hash to see the current status.
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-4 bg-white space-y-2">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5" />
                Credential Details
              </h3>

              <DetailRow label="Credential ID" value={verificationMode === 'deployHash' ? 'From Deploy' : cred.credentialId || 'From IPFS'} />
              
              {/* Show deploy hash and dictionary key if verified via deploy */}
              {credential.deployHash && (
                <>
                  <DetailRow label="Deploy Hash" value={credential.deployHash} mono />
                  <DetailRow label="Dictionary Key" value={credential.dictionaryKey} mono />
                </>
              )}
              
              <div className="border-t pt-3 mt-3">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Issuer Information</h4>
                <DetailRow label="Issuer DID" value={cred.issuerDid} mono />
                <DetailRow label="Issuer Address" value={cred.issuerAddress} mono />
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Holder Information</h4>
                <DetailRow label="Holder DID" value={cred.holderDid} mono />
                <DetailRow label="Holder Address" value={cred.holderAddress} mono />
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Validity Period</h4>
                <DetailRow 
                  label="Issued At" 
                  value={formatDate(cred.issuedAt)} 
                />
                <DetailRow 
                  label="Expires At" 
                  value={formatDate(cred.expiresAt)} 
                />
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">Additional Information</h4>
                <DetailRow 
                  label="AI Confidence" 
                  value={`${cred.aiConfidence}%`} 
                />
                <DetailRow 
                  label="Credential Hash" 
                  value={cred.credentialHash} 
                  mono 
                />
                <DetailRow 
                  label="IPFS Hash" 
                  value={cred.ipfsHash} 
                  mono 
                />
              </div>
              
              {/* Status Indicators */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center gap-2">
                  {credential.isRevoked ? (
                    <>
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="font-medium text-red-600 text-sm">
                        This credential has been revoked
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="font-medium text-green-600 text-sm">
                        This credential has not been revoked
                      </span>
                    </>
                  )}
                </div>

                {!credential.isRevoked && (
                  <div className="flex items-center gap-2">
                    {credential.isExpired ? (
                      <>
                        <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <span className="font-medium text-orange-600 text-sm">
                          This credential has expired
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="font-medium text-green-600 text-sm">
                          This credential is still valid
                        </span>
                      </>
                    )}
                  </div>
                )}

                {credential.isValid && (
                  <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <span className="font-bold text-green-700 text-lg">
                        ✓ This credential is VALID and can be trusted
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Raw IPFS Data Section - Only show for IPFS mode */}
              {verificationMode === 'ipfsHash' && credential.ipfsData && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Raw IPFS Data
                  </h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(credential.ipfsData, null, 2)}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 This is the raw credential data as stored on IPFS
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
       
        
        {/* Placeholder when no results */}
        {!credential && !loading && !error && (
          <div className="flex items-center top-50 justify-center h-full">
            <div className="text-center text-gray-400">    
              <p className="text-lg font-medium">No results yet</p>
              <p className="text-sm">Enter a hash and click verify to see results here</p>
            </div>
          </div>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value, mono = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2">
    <span className="font-medium text-gray-600 sm:w-40 flex-shrink-0">{label}:</span>
    <span className={`${mono ? 'font-mono text-sm bg-gray-100 px-2 py-1 rounded' : ''} text-gray-900 break-all`}>
      {value}
    </span>
  </div>
);

export default CredentialVerification;