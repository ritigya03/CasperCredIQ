// dashboard/page.tsx
"use client";

import WalletConnect from "../../components/WalletConnect";
import AIVerificationForm from "../../components/AIVerificationForm";
import Link from "next/link";
import { 
  ArrowLeft, 
  Activity, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  UserCheck, 
  XCircle,
  TrendingUp
} from "lucide-react";
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

  const navItems = [
    { href: '/users', label: 'Requests', icon: UserCheck, color: 'blue' },
    { href: '/issue', label: 'Issue', icon: FileText, color: 'green' },
    { href: '/verify', label: 'Verify', icon: ShieldCheck, color: 'indigo' },
    { href: '/admin', label: 'Revoke', icon: XCircle, color: 'red' },
    { href: '/audit', label: 'Audit Logs', icon: Activity, color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
               <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    CasperCredIQ
                  </h1>
                  <p className="text-xs text-gray-500">
                    Decentralized Credentials
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Info & Connect */}
            <div className="flex items-center gap-3">
              {/* Explorer Link */}
              {walletState.isConnected && walletState.publicKey && (
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors border border-blue-200"
                  title="View on Explorer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden lg:inline">Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {/* Wallet Connect Button */}
              <WalletConnect />
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
                red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
              }[item.color];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${colorClasses} text-sm font-medium rounded-lg transition-all border whitespace-nowrap`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Info Cards Grid */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* About Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  What is CasperCredIQ?
                </h3>
                <p className="text-sm text-gray-600">
A blockchain-based credential system on Casper that issues, verifies, and revokes role-based verifiable credentials with built-in access control, audit trails, and rate limiting.
It combines AI confidence scoring, IPFS-backed credential storage, and cryptographic verification to ensure secure, tamper-proof, and privacy-aware identity validation.
                </p>
              </div>
            </div>
          </div>

          {/* How it Works Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  How it works
                </h3>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Request → AI verifies</li>
                  <li>2. Issuer approves & issues and access control</li>
                  <li>3. Stored on IPFS + Casper</li>
                  <li>4. Verify and Revoke anytime on-chain</li>
                  <li>5. Audit trails created + Rate limiting</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* AI Verification Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Verification</h3>
              <p className="text-sm text-gray-600">Submit your credentials for AI-powered verification</p>
            </div>
          </div>
          <AIVerificationForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 bg-white/50 backdrop-blur-sm border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">⚠️ Testnet Only - Do not use with real value</p>
            <p className="mt-2 text-xs text-gray-500">
              Contract: <code className="bg-gray-100 px-2 py-1 rounded">hash-971986539f375a9c7da1879177f11c5fa8b0a28f50ae61e93480a3522ce347c7</code>
            </p>
            <div className="mt-3 flex justify-center gap-4 text-sm">
              <Link href="/verify" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Verify Credential →
              </Link>
              <Link href="/audit" className="text-purple-600 hover:text-purple-700 font-medium">
                Audit Logs →
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}