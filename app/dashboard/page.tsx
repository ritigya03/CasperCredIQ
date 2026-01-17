// dashboard/page.tsx
"use client";

import WalletConnect from "../../components/WalletConnect";
import AIVerificationForm from "../../components/AIVerificationForm";
import RoleResources from "../../components/RoleResources";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                CasperCredIQ
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Decentralized Role-Based Access Control
              </p>
            </div>

            <div className="flex items-center space-x-4">
                {/* Issue Button */}
              <Link
                href="/issue"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Issue Credential
              </Link>
              {/* Verify Button */}
              <Link
                href="/verify"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Verify Credential
              </Link>

              {/* Admin Button */}
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
<div className="mb-6 bg-white rounded-lg shadow p-4 border">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold">Request Credentials</h2>
    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-medium">
      Step 1
    </span>
  </div>

  <div className="bg-gray-50 p-3 rounded-md mb-4">
    <p className="text-xs text-gray-700">
      Submit your request → AI verifies → Admin issues your credential.
    </p>
  </div>

  <AIVerificationForm />
</div>

{/* Role Resources */}
{/* <div className="bg-white rounded-lg shadow p-4 border">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-semibold">Roles & Resources</h2>
    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-medium">
      Step 2
    </span>
  </div>

  <div className="bg-gray-50 p-3 rounded-md mb-4">
    <p className="text-xs text-gray-700">
      Your role decides what tools and data you can access.
    </p>
  </div>

  <RoleResources />
</div> */}


      


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
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Verify Credential →
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Go to Admin Panel →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}