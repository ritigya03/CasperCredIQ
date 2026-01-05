"use client"
import  { useState } from 'react';
import { AlertCircle, CheckCircle, Shield, Clock, User, Key, Server, ArrowLeft } from 'lucide-react';

// Change this to your backend URL
const API_URL = 'http://localhost:3001/api';

function CredentialViewer() {
  const [deployHash, setDeployHash] = useState('');
  const [dictionaryKey, setDictionaryKey] = useState('');
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Query by deploy hash
  const queryByDeployHash = async () => {
    if (!deployHash.trim()) {
      setError('Please enter a deploy hash');
      return;
    }

    setLoading(true);
    setError('');
    setCredential(null);
    
    try {
      const response = await fetch(`${API_URL}/credential/deploy/${deployHash.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credential');
      }
      
      setCredential(data.credential);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch credential');
    } finally {
      setLoading(false);
    }
  };

  // Query by dictionary key
  const queryByDictionaryKey = async () => {
    if (!dictionaryKey.trim()) {
      setError('Please enter a dictionary key');
      return;
    }

    setLoading(true);
    setError('');
    setCredential(null);
    
    try {
      const response = await fetch(`${API_URL}/credential/dictionary/${dictionaryKey.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credential');
      }
      
      setCredential(data.credential);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch credential');
    } finally {
      setLoading(false);
    }
  };

  // Load example credential
  const loadExample = () => {
    setDeployHash('490fd821dfa1a55f16afdc3dde49f2de6e400b262412ff128015e416ba2b8a7d');
    setTimeout(() => {
      queryByDeployHash();
    }, 100);
  };

  const decodeRole = (roleData) => {
    if (!roleData) return 'Unknown';
    
    if (typeof roleData === 'string') {
      const cleaned = roleData.match(/[a-zA-Z0-9]+/g);
      if (cleaned && cleaned.length > 0) {
        return cleaned.reduce((a, b) => a.length > b.length ? a : b);
      }
    }
    
    return 'Unknown';
  };

  // Check if credential is valid (not checking dates for now)
  const isValid = credential && !credential.revoked;

  const goBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-10 h-10 text-indigo-400" />
            <h1 className="text-4xl font-bold text-slate-800">CasperCred Viewer</h1>
          </div>


          {/* Query Methods */}
          <div className="space-y-6 mb-8">
            {/* Method 1: By Deploy Hash */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Query by Deploy Hash</h2>
              <p className="text-slate-600 text-sm mb-4">Enter the deploy hash from a mint transaction</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g., 490fd821dfa1a55f16afdc3dde49f2de..."
                  value={deployHash}
                  onChange={(e) => setDeployHash(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && queryByDeployHash()}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <button
                  onClick={queryByDeployHash}
                  disabled={loading}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Loading...' : 'Query'}
                </button>
              </div>
              <button
                onClick={loadExample}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm rounded-lg transition-colors"
              >
                Load Example
              </button>
            </div>

            {/* Method 2: By Dictionary Key */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Query by Dictionary Key</h2>
              <p className="text-slate-600 text-sm mb-4">If you already know the dictionary key</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g., dictionary-4e10e28720d50f01d3f6f7792009e96a..."
                  value={dictionaryKey}
                  onChange={(e) => setDictionaryKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && queryByDictionaryKey()}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <button
                  onClick={queryByDictionaryKey}
                  disabled={loading}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Loading...' : 'Query'}
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Credential Display */}
          {credential && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Credential Details</h2>
                {isValid ? (
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-semibold">VALID</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-semibold">REVOKED</span>
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <User className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Role</p>
                    <p className="text-slate-800 font-semibold text-lg">{decodeRole(credential.role)}</p>
                  </div>
                </div>

                {/* Commented out date sections */}
                {/*
                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Issued At</p>
                    <p className="text-slate-800 font-mono">{formatDate(credential.issuedAt)}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Raw: {String(credential.issuedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Expires At</p>
                    <p className="text-slate-800 font-mono">{formatDate(credential.expiresAt)}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Raw: {String(credential.expiresAt)}
                    </p>
                  </div>
                </div>
                */}

                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <Key className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Issuer</p>
                    <p className="text-slate-800 font-mono text-sm break-all">{credential.issuer}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Revoked</p>
                    <p className={`font-semibold ${credential.revoked ? 'text-red-600' : 'text-green-600'}`}>
                      {credential.revoked ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {credential.accountHash && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <User className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-slate-500 text-sm">Account</p>
                      <p className="text-slate-800 font-mono text-sm break-all">{credential.accountHash}</p>
                    </div>
                  </div>
                )}

                {credential.blockHeight && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                    <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-slate-500 text-sm">Block Height</p>
                      <p className="text-slate-800 font-mono">{credential.blockHeight}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200">
                  <Key className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">Dictionary Key</p>
                    <p className="text-slate-800 font-mono text-xs break-all">{credential.dictionaryKey}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
}

export default CredentialViewer;