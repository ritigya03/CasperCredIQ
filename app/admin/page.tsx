// src/app/admin/page.tsx
import Link from 'next/link';
import WalletConnect from '../../components/WalletConnect';
import AdminPanel from '../../components/AdminPanel';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🛠️ Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Manage credentials and monitor the credential system
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Main
            </Link>
            <WalletConnect />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Admin Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Credential Management</h2>
                <p className="text-purple-200 text-sm">Mint, revoke, and verify credentials</p>
              </div>
              <div className="p-6">
                <AdminPanel />
              </div>
            </div>
          </div>

          {/* Sidebar - Admin Info */}
          <div className="space-y-6">
            {/* Admin Status Card */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Admin Privileges
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Issue new credentials with roles</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Revoke existing credentials</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Verify any user's credential status</span>
                </li>
              </ul>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl shadow-md border border-blue-100">
              <h3 className="text-lg font-bold mb-4 text-blue-900">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-xs text-gray-600">Active Today</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-gray-600">Total Issued</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-xs text-gray-600">Revoked</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">3</div>
                  <div className="text-xs text-gray-600">Available Roles</div>
                </div>
              </div>
            </div>

            {/* Warning Card */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-bold text-yellow-900 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Important Notes
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Only the issuer address can perform admin actions</li>
                <li>• Each transaction costs gas (CSPR)</li>
                <li>• Blockchain confirmations take 1-2 minutes</li>
                <li>• Revocation is permanent and cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contract Info Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4">Contract Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Contract Hash</p>
           
            </div>
            <div>
              <p className="text-sm text-gray-600">Network</p>
              <p className="text-sm font-medium text-gray-900">Casper Testnet</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}