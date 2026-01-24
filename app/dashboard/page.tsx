// dashboard/page.tsx
"use client";

import WalletConnect from "../../components/WalletConnect";
import AIVerificationForm from "../../components/AIVerificationForm";
import RoleResources from "../../components/RoleResources";
import Link from "next/link";
import { ArrowLeft, Activity, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { walletManager } from "../../lib/wallet";

export default function Home() {
  const [walletState, setWalletState] = useState(walletManager.getState());

  useEffect(() => {
    walletManager.syncWithWallet();
    const unsubscribe = walletManager.subscribe((state) => {
      setWalletState(state);
    });
    return unsubscribe;
  }, []);

  const getExplorerUrl = () => {
    if (!walletState.publicKey) return '#';
    return `https://testnet.cspr.live/account/${walletState.publicKey}`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                title="Back to Home"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CasperCredIQ
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Decentralized Role-Based Access Control
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Activity Button - Links to Testnet Explorer */}
              {walletState.isConnected && walletState.publicKey ? (
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <Activity className="w-4 h-4" />
                  Activity
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed shadow-sm"
                >
                  <Activity className="w-4 h-4" />
                  Activity
                </button>
              )}

              {/* Request Status Button */}
              <Link
                href="/users"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Request Page
              </Link>

              {/* Issue Button */}
              <Link
                href="/issue"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Issue Credential
              </Link>
              
              {/* Verify Button */}
              <Link
                href="/verify"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Verify Credential
              </Link>

              {/* Revoke Button */}
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Revoke Credential
              </Link>

              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Project Description Section */}
        {/* About Section */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="font-medium text-blue-900 text-sm mb-1">
                  What is Casper Credentials?
                </h3>
                <p className="text-xs text-gray-700">
                  A blockchain-based system to issue and verify role-based credentials
                  using AI + Casper network.
                </p>
              </div>

              <div className="bg-green-50 p-3 rounded-md">
                <h3 className="font-medium text-green-900 text-sm mb-1">
                  How it works
                </h3>
                <ol className="text-xs text-gray-700 list-decimal list-inside space-y-1">
                  <li>Request → AI verifies</li>
                  <li>Issuer reviews, approves & issues</li>
                  <li>Stored on IPFS + Casper</li>
                  <li>User can verify anytime</li>
                  <li>Issuer can revoke if suspicious</li>
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-purple-50 p-3 rounded-md">
                <h3 className="font-medium text-purple-900 text-sm mb-1">
                  Key Features
                </h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>✓ AI verification</li>
                  <li>✓ IPFS storage</li>
                  <li>✓ Blockchain records</li>
                  <li>✓ Role-based access</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-3 rounded-md">
                <h3 className="font-medium text-yellow-900 text-sm mb-2">
                  For whom?
                </h3>
                <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    Enterprises
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                    Education
                  </span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                    Government
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Verification Form */}
        <div className="mb-6 bg-purple-50 rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between mb-3">
          </div>

          <AIVerificationForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>⚠️ Testnet Only - Do not use with real value</p>
          <p className="mt-2 text-xs">
            Contract:{" "}
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              hash-971986539f375a9c7da1879177f11c5fa8b0a28f50ae61e93480a3522ce347c7
            </code>
          </p>
          <div className="mt-2 flex justify-center space-x-4">
            <Link
              href="/verify"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Verify Credential →
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Revoke Credential →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}