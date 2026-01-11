"use client";

import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, User, Shield, FileText, ExternalLink, AlertCircle, Loader2, Database, Globe } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function CredentialVerification() {
  const [credentialId, setCredentialId] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [mode, setMode] = useState('blockchain'); // 'blockchain' or 'ipfs'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [ipfsData, setIpfsData] = useState(null);

  const handleVerifyBlockchain = async () => {
    if (!credentialId.trim()) {
      setError('Please enter a credential ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setIpfsData(null);

    try {
      console.log(`Verifying credential on blockchain: ${credentialId}`);
      
      const response = await fetch(`${API_URL}/api/blockchain/credential/${encodeURIComponent(credentialId.trim())}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Blockchain verification failed');
      }
      
      if (data.success) {
        setResult(data.credential);
        
        // If IPFS hash is available, fetch the data
        if (data.credential.ipfsHash) {
          try {
            const ipfsResponse = await fetch(`${API_URL}/api/ipfs/${data.credential.ipfsHash}`);
            if (ipfsResponse.ok) {
              const ipfsResult = await ipfsResponse.json();
              setIpfsData(ipfsResult.data);
            }
          } catch (ipfsError) {
            console.log('IPFS data fetch failed:', ipfsError.message);
          }
        }
      } else {
        setError(data.message || 'Credential not found');
      }
      
    } catch (err) {
      console.error('Verification error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIPFS = async () => {
    if (!ipfsHash.trim()) {
      setError('Please enter an IPFS hash');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setIpfsData(null);

    try {
      console.log(`Fetching IPFS data: ${ipfsHash}`);
      
      const response = await fetch(`${API_URL}/api/ipfs/${ipfsHash.trim()}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'IPFS fetch failed');
      }
      
      if (data.success) {
        setIpfsData(data.data);
        
        // Create a result object from IPFS data
        setResult({
          credentialId: data.data.credentialId || 'From IPFS',
          holder: data.data.holder || data.data.recipientName || data.data.recipientAddress || 'N/A',
          issuer: data.data.issuer || data.data.issuerName || data.data.issuerAddress || 'N/A',
          ipfsHash: ipfsHash.trim(),
          valid: true, // Assume valid for IPFS view
          verifiedOnChain: false,
          timestamp: new Date().toISOString(),
          note: 'Data from IPFS only (no blockchain verification)'
        });
      } else {
        setError(data.message || 'Could not fetch IPFS data');
      }
      
    } catch (err) {
      console.error('IPFS fetch error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (mode === 'blockchain') {
      handleVerifyBlockchain();
    } else {
      handleVerifyIPFS();
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    if (typeof address !== 'string') return String(address);
    if (address.length <= 16) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return 'Invalid date';
    } catch {
      return 'Invalid timestamp';
    }
  };

  const getStatusColor = () => {
    if (!result) return 'gray';
    if (result.valid === false) return 'red';
    if (result.verifiedOnChain === false && mode === 'ipfs') return 'blue';
    return 'green';
  };

  const getStatusText = () => {
    if (!result) return 'Unknown';
    if (result.valid === false) return 'INVALID';
    if (result.verifiedOnChain === false && mode === 'ipfs') return 'IPFS ONLY';
    if (result.verifiedOnChain === true && result.valid === true) return 'VALID';
    return 'UNKNOWN';
  };

  const getStatusIcon = () => {
    if (!result) return null;
    if (result.valid === false) return <XCircle className="w-6 h-6 text-red-500" />;
    if (result.verifiedOnChain === false && mode === 'ipfs') return <FileText className="w-6 h-6 text-blue-500" />;
    return <CheckCircle className="w-6 h-6 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-indigo-600" />
            <Globe className="w-10 h-10 text-indigo-600" />
            <Database className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Credential Verification
          </h1>
          <p className="text-gray-600">
            Verify credentials on Casper blockchain or view IPFS data
          </p>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => {
                setMode('blockchain');
                setError('');
                setResult(null);
                setIpfsData(null);
              }}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                mode === 'blockchain'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Database className="w-5 h-5" />
                <span>Blockchain</span>
              </div>
            </button>
            <button
              onClick={() => {
                setMode('ipfs');
                setError('');
                setResult(null);
                setIpfsData(null);
              }}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                mode === 'ipfs'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <FileText className="w-5 h-5" />
                <span>IPFS</span>
              </div>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              {mode === 'blockchain' ? (
                <input
                  type="text"
                  placeholder="Enter Credential ID (e.g., CRED_123456)"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-lg"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Enter IPFS Hash (e.g., QmXxx...)"
                  value={ipfsHash}
                  onChange={(e) => setIpfsHash(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-lg"
                />
              )}
            </div>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Verify
                </>
              )}
            </button>
          </div>

          {/* Info text */}
          <div className="text-sm text-gray-600">
            {mode === 'blockchain' ? (
              <div>
                <p><strong>Blockchain Verification:</strong> Query the smart contract directly to verify credential validity.</p>
                <p className="text-xs mt-1 text-indigo-600">Checks: Existence, Validity, Revocation, Expiry, Holder, Issuer, IPFS Hash</p>
              </div>
            ) : (
              <div>
                <p><strong>IPFS View:</strong> Directly view credential data stored on IPFS.</p>
                <p className="text-xs mt-1 text-blue-600">Note: This does not verify blockchain status. For complete verification, use Blockchain mode.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className={`bg-white rounded-2xl shadow-xl p-8 mb-6 border-l-8 border-${getStatusColor()}-500`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getStatusText()}
                  </h2>
                  <p className="text-gray-600">
                    {mode === 'blockchain' 
                      ? (result.verifiedOnChain ? 'Verified on Blockchain' : 'Blockchain verification failed')
                      : 'Data from IPFS'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Mode</div>
                <div className="font-semibold text-indigo-600">{mode.toUpperCase()}</div>
              </div>
            </div>

            {/* Credential Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {mode === 'blockchain' ? <Database className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {mode === 'blockchain' ? 'Blockchain Data' : 'Credential Data'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Credential ID</div>
                    <div className="font-mono font-semibold text-gray-900 truncate">
                      {result.credentialId}
                    </div>
                  </div>
                  {result.holder && (
                    <div>
                      <div className="text-sm text-gray-600">Holder</div>
                      <div className="font-mono text-sm text-gray-900 truncate">
                        {formatAddress(result.holder)}
                      </div>
                    </div>
                  )}
                  {result.issuer && (
                    <div>
                      <div className="text-sm text-gray-600">Issuer</div>
                      <div className="font-mono text-sm text-gray-900 truncate">
                        {formatAddress(result.issuer)}
                      </div>
                    </div>
                  )}
                  {result.valid !== undefined && mode === 'blockchain' && (
                    <div>
                      <div className="text-sm text-gray-600">Valid</div>
                      <div className={`font-semibold ${result.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {result.valid ? 'YES' : 'NO'}
                      </div>
                    </div>
                  )}
                  {result.verifiedOnChain !== undefined && (
                    <div>
                      <div className="text-sm text-gray-600">Blockchain Verified</div>
                      <div className={`font-semibold ${result.verifiedOnChain ? 'text-green-600' : 'text-blue-600'}`}>
                        {result.verifiedOnChain ? 'YES' : 'NO'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Additional Information
                </h3>
                <div className="space-y-3">
                  {result.timestamp && (
                    <div>
                      <div className="text-sm text-gray-600">Verified At</div>
                      <div className="font-semibold text-gray-900">
                        {formatTimestamp(result.timestamp)}
                      </div>
                    </div>
                  )}
                  {result.ipfsHash && (
                    <div>
                      <div className="text-sm text-gray-600">IPFS Hash</div>
                      <a
                        href={`https://white-real-badger-280.mypinata.cloud/ipfs/${result.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-indigo-600 hover:underline truncate block"
                      >
                        {result.ipfsHash}
                      </a>
                    </div>
                  )}
                  {result.note && (
                    <div>
                      <div className="text-sm text-gray-600">Note</div>
                      <div className="text-sm text-gray-700">{result.note}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* IPFS Data Button */}
            {ipfsData && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(ipfsData, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `credential-${result.credentialId || 'ipfs'}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download IPFS Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* Raw IPFS Data Display */}
        {ipfsData && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              IPFS Data Content
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 overflow-auto max-h-96">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(ipfsData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CredentialVerification;