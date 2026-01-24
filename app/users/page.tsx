"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Search, CheckCircle, Clock, XCircle, Shield, Lock, Unlock, Eye, FileText, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RequestStatus {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  aiConfidence: number;
  aiRecommendation: boolean;
  submittedAt: string;
  credentialId?: string;
  deployHash?: string;
  ipfsHash?: string;
}

const ACCESS_LEVELS = [
  {
    level: 0,
    name: 'User',
    color: 'from-gray-400 to-gray-500',
    icon: Shield,
    permissions: [
      'View own credentials',
      'Request new credentials',
      'Track request status'
    ],
    gates: ['Basic Access', 'Self-Service Portal']
  },
  {
    level: 2,
    name: 'Issuer',
    color: 'from-blue-500 to-blue-600',
    icon: FileText,
    permissions: [
      'Issue credentials',
      'View issued credentials',
      'Approve/Reject requests',
      'All User permissions'
    ],
    gates: ['Credential Issuance', 'Request Management', 'Issuer Dashboard']
  },
  {
    level: 3,
    name: 'Viewer',
    color: 'from-purple-500 to-purple-600',
    icon: Eye,
    permissions: [
      'View all credentials',
      'Access audit logs',
      'Monitor system activity',
      'All Issuer permissions'
    ],
    gates: ['Full Credential Access', 'Audit Trail', 'Analytics Dashboard']
  },
  {
    level: 4,
    name: 'Owner',
    color: 'from-red-500 to-red-600',
    icon: Lock,
    permissions: [
      'Full system control',
      'Manage access levels',
      'Transfer ownership',
      'Pause/Unpause contract',
      'All permissions'
    ],
    gates: ['System Administration', 'Access Control', 'Emergency Controls', 'Contract Management']
  }
];

export default function UsersPage() {
  const router = useRouter();
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:3001';

  const searchRequest = async () => {
    if (!requestId.trim()) {
      setError('Please enter a request ID');
      return;
    }

    setLoading(true);
    setError('');
    setRequest(null);

    try {
      const response = await fetch(`${API_URL}/api/requests`);
      const data = await response.json();

      if (data.success && data.requests) {
        const found = data.requests.find((r: any) => r.id === requestId.trim());
        
        if (found) {
          setRequest(found);
        } else {
          setError('Request ID not found. Please check and try again.');
        }
      } else {
        setError('Failed to fetch requests. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching request:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'issued':
        return <Shield className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'issued':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className=" ">
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
               
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    User Portal
                  </h1>
                  <p className="text-sm text-gray-600">
                    Track your credential requests and explore access levels
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Request Tracker Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Search className="w-6 h-6 text-indigo-600" />
                Track Your Request
              </h2>
              
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRequest()}
                  placeholder="Enter your request ID (e.g., req_1234567890)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={searchRequest}
                  disabled={loading}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-all font-medium shadow-md"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Search
                    </>
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800 text-sm">{error}</div>
                </div>
              )}

              {/* Request Details */}
              {request && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">Request Details</h3>
                    <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 ${getStatusColor(request.status || 'pending')}`}>
                      {getStatusIcon(request.status || 'pending')}
                      <span className="font-semibold capitalize">{request.status || 'pending'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900 font-medium">{request.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900 font-medium">{request.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Role</label>
                      <p className="text-gray-900 font-medium">{request.role}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Organization</label>
                      <p className="text-gray-900 font-medium">{request.organization}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">AI Confidence</label>
                      <p className="text-gray-900 font-medium">{Math.round(request.aiConfidence * 100)}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submitted</label>
                      <p className="text-gray-900 font-medium">{new Date(request.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Credential Info if issued */}
                  {request.status === 'issued' && (request.deployHash || request.ipfsHash) && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold text-gray-700 mb-3">Credential Information</h4>
                      <div className="space-y-2">
                        {request.deployHash && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-600">Deploy Hash</p>
                              <p className="text-sm font-mono text-gray-800">{request.deployHash.slice(0, 20)}...</p>
                            </div>
                            <button
                              onClick={() => router.push(`/verify?hash=${request.deployHash}&mode=deploy`)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
                            >
                              <Shield className="w-4 h-4" />
                              Verify
                            </button>
                          </div>
                        )}
                        {request.ipfsHash && (
                          <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-600">IPFS Hash</p>
                              <p className="text-sm font-mono text-gray-800">{request.ipfsHash.slice(0, 20)}...</p>
                            </div>
                            <button
                              onClick={() => router.push(`/verify?hash=${request.ipfsHash}&mode=ipfs`)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                            >
                              <FileText className="w-4 h-4" />
                              View Data
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Access Levels Section */}
            <div className="bg-white  rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Lock className="w-6 h-6 text-indigo-600" />
                Role-Based Access Levels
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                CasperCredIQ uses a 4-level access control system. Each level unlocks specific gates and permissions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ACCESS_LEVELS.map((level) => (
                  <div
                    key={level.level}
                    className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${level.color} flex items-center justify-center`}>
                        <level.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Level {level.level}</h3>
                        <p className="text-sm font-semibold text-gray-600">{level.name}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Unlocked Gates:</h4>
                      <div className="flex flex-wrap gap-2">
                        {level.gates.map((gate, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                            <Unlock className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-700">{gate}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Permissions:</h4>
                      <ul className="space-y-1">
                        {level.permissions.map((permission, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{permission}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Note:</strong> Access levels are managed on-chain by the contract owner. Higher levels inherit all permissions from lower levels. Contact your system administrator to request an access level upgrade.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {/* <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/request')}
                  className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-3"
                >
                  <FileText className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-semibold">Request Credential</div>
                    <div className="text-xs opacity-90">Submit a new request</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/verify')}
                  className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-3"
                >
                  <Shield className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-semibold">Verify Credential</div>
                    <div className="text-xs opacity-90">Check credential status</div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/issue')}
                  className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-3"
                >
                  <Lock className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-semibold">Issuer Dashboard</div>
                    <div className="text-xs opacity-90">Manage requests</div>
                  </div>
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
