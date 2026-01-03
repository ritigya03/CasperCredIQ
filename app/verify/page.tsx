// src/app/verify/page.tsx
import Link from 'next/link';
import WalletConnect from '../../components/WalletConnect';
import VerifyStatus from '../../components/VerifyStatus';

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Verify Credential
          </h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <WalletConnect />
        </div>

        {/* Verify Status */}
        <VerifyStatus />
      </div>
    </main>
  );
}