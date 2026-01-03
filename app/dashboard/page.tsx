// app/page.tsx
"use client"

import WalletConnect from "@/components/WalletConnect"
import IssueCredential from "@/components/IssueCredential"
import VerifyStatus from "@/components/VerifyStatus"
import RoleResources from "@/components/RoleResources"
import AIVerificationForm from "@/components/AIVerificationForm"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔐 Casper Credentials</h1>
              <p className="text-sm text-gray-600 mt-1">Decentralized Role-Based Access Control</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Simple Admin Button - Always visible */}
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Admin Panel
              </Link>

              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Rest of your existing page content remains exactly the same... */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner - Keep as is */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How It Works</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Connect your Casper wallet</li>
                <li>Issue a credential to yourself (select role & validity)</li>
                <li>Wait 1-2 minutes for blockchain confirmation</li>
                <li>Verify your credential status</li>
                <li>View your available resources</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Grid Layout - Keep as is */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <IssueCredential />
            <VerifyStatus />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <AIVerificationForm />
            <RoleResources />

            {/* Info Card */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <span className="mr-2">📚</span>
                About This System
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>Decentralized:</strong> Credentials are stored on the Casper blockchain, not in a central
                  database.
                </p>
                <p>
                  <strong>Tamper-Proof:</strong> Once issued, credentials cannot be altered without blockchain
                  consensus.
                </p>
                <p>
                  <strong>Self-Sovereign:</strong> You control your own credentials through your wallet's private key.
                </p>
                <p>
                  <strong>Smart Contract Verified:</strong> Access is granted automatically by verifying on-chain
                  credentials.
                </p>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Network:</strong> Casper Testnet
                  <br />
                  <strong>Gas Required:</strong> ~10 CSPR per credential
                  <br />
                  <strong>Confirmation Time:</strong> 1-2 minutes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Built on <strong>Casper Network</strong> • Secured by blockchain technology
          </p>
          <p className="mt-2">Need help? Check the browser console (F12) for detailed logs</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>⚠️ Testnet Only - Do not use with real value</p>
          <p className="mt-1">
            Contract: <code className="text-xs bg-gray-100 px-2 py-1 rounded">hash-73c27...ab8fa</code>
          </p>
          {/* Simple admin link in footer too */}
          <p className="mt-2">
            <Link href="/admin" className="text-gray-700 hover:text-gray-900 font-medium">
              Go to Admin Panel →
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
