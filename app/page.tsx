"use client"

import { useState } from "react"
import {
  ShieldCheck,
  Cpu,
  History,
  Database,
  ArrowRight,
  Globe,
  Zap,
  CheckCircle2,
  Lock,
  LayoutDashboard,
  LogOut,
  Info,
  Menu,
  X,
  Building,
  Users,
  Key,
  Shield,
  RefreshCw,
  Clock,
  FileText,
  Copy,
  Check,
  Fingerprint,
  Activity,
  AlertTriangle,
  UserX,
  Edit,
} from "lucide-react"
import Link from "next/link"
import WalletConnect from "../components/WalletConnect"
import { useRouter } from "next/navigation"

// Custom Button Component
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "xl";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const Button = ({ 
  children, 
  onClick, 
  variant = "default", 
  size = "default",
  className = "",
  disabled = false,
  type = "button"
}: ButtonProps) => {
  const baseStyles = "font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
  
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
    secondary: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-gray-400",
    outline: "bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-300 hover:border-blue-400",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900",
    destructive: "bg-red-500 hover:bg-red-600 text-white"
  }
  
  const sizes = {
    default: "px-4 py-2.5 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg"
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Card = ({ children, className = "", style = {} }: CardProps) => {
  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}

// Contract Hash Component
const ContractHashDisplay = () => {
  const contractHash = "7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-8 md:mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Live Smart Contract</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Deployed
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            This is the main CasperCredIQ contract address on the Casper Network
          </p>
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg flex-1 overflow-x-auto">
              {contractHash}
            </div>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Copy contract hash"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://testnet.cspr.live/contract/${contractHash}`, '_blank')}
            className="whitespace-nowrap"
          >
            View on Explorer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://github.com/ritigya03/CasperCredIQ', '_blank')}
            className="whitespace-nowrap"
          >
            View Source
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleStart = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              CasperCredIQ
            </span>
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          
          <nav className="hidden md:flex items-center space-x-8">
            {["Product", "Solutions", "Technology", "Contract"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <WalletConnect onConnect={handleConnect} />
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 py-4 px-6">
            <div className="flex flex-col space-y-4">
              {["Product", "Solutions", "Technology", "Contract"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 -z-10" />
          
          <div className="container mx-auto px-4 md:px-6">
          
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 mb-6">
                <Shield className="h-3 w-3 mr-2" />
                Cybersecurity-First Credential Infrastructure
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900">
                Security by Design:
                <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  STRIDE-Hardened Credentials
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
  Built on W3C standards, Zero Trust principles, and STRIDE threat modeling. CasperCredIQ implements 
                cryptographic verification, role-based access control, and complete audit trails to create 
                tamper-proof, instantly revocable credentials on the Casper blockchain.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                {!isConnected ? (
                  <Button
                    size="xl"
                    onClick={handleConnect}
                    className="rounded-xl px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <ShieldCheck className="inline mr-2 h-5 w-5" />
                    Connect Wallet to Begin
                  </Button>
                ) : (
                  <Button
                    size="xl"
                    onClick={handleStart}
                    className="rounded-xl px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <LayoutDashboard className="inline mr-2 h-5 w-5" />
                    Enter Dashboard
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => window.open('https://github.com/ritigya03/CasperCredIQ', '_blank')}
                  className="rounded-xl px-8 py-4 text-lg font-semibold"
                >
                  <FileText className="inline mr-2 h-5 w-5" />
                  Repository
                </Button>
              </div>
            </div>
          </div>
        </section>
  {/* Contract Hash Display */}
  <div className="container mx-auto px-4 md:px-6">
 <ContractHashDisplay />
  </div>
           {/* Security Foundations */}
        <section id="security" className="py-16 md:py-24 bg-gradient-to-b from-white to-blue-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Built on Proven Cybersecurity Foundations
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Every design decision backed by industry-standard security frameworks
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "W3C Verifiable Credentials",
                  icon: Fingerprint,
                  color: "from-blue-500 to-blue-600",
                  standard: "W3C VC Standard",
                  desc: "Implements issuer DIDs, holder DIDs, credential hashes, and digital signatures following W3C specifications.",
                  security: "Digital signatures ensure authentication and non-repudiation. Even if IPFS storage is compromised, credentials cannot be forged because signatures won't verify against the on-chain issuer DID.",
                  features: ["Cryptographic authentication", "Non-repudiation guarantee", "Tamper-evident design"]
                },
                {
                  title: "Zero Trust Architecture",
                  icon: Lock,
                  color: "from-purple-500 to-purple-600",
                  standard: "Zero Trust Security",
                  desc: "Never trust, always verify. Four-tier access control: No Access → Viewer → Issuer → Auditor → Owner.",
                  security: "Least-privilege principle enforced on-chain. Every action requires explicit authorization checks. No implicit trust relationships.",
                  features: ["Explicit verification", "Least privilege", "Assume breach mindset"]
                },
                {
                  title: "AI Explainable Decisions",
                  icon: Cpu,
                  color: "from-green-500 to-green-600",
                  standard: "XAI Framework",
                  desc: "AI evaluates credential requests and provides confidence scores (0-100%) with transparent justifications.",
                  security: "Human-in-the-loop oversight prevents automated abuse. Issuer retains final authority over all credential issuance decisions.",
                  features: ["Transparency", "Human oversight", "Audit trail of AI decisions"]
                },
                {
                  title: "Complete Audit Logs",
                  icon: History,
                  color: "from-orange-500 to-orange-600",
                  standard: "NIST 800-53",
                  desc: "Immutable on-chain audit trail for every credential action: issued, verified, revoked.",
                  security: "Forensic-grade logging enables incident investigation and compliance demonstration. Timestamped and cryptographically linked to actors.",
                  features: ["Immutable records", "Forensic analysis", "Compliance reporting"]
                },
                {
                  title: "Rate Limiting & Abuse Prevention",
                  icon: Activity,
                  color: "from-red-500 to-red-600",
                  standard: "DoS Mitigation",
                  desc: "Smart contract enforces 25 credentials/hour issuance limit and 50 verifications/hour per address.",
                  security: "Prevents spam attacks and credential flooding. Suspicious activity triggers automatic blocking and event logging.",
                  features: ["Spam prevention", "Auto-blocking", "Behavioral analysis"]
                },
                {
                  title: "Cryptographic Verification",
                  icon: ShieldCheck,
                  color: "from-indigo-500 to-indigo-600",
                  standard: "PKI Principles",
                  desc: "Hash-based integrity verification ensures credential data hasn't been altered since issuance.",
                  security: "On-chain hash comparison prevents tampering. Any modification to credential data invalidates the hash, making forgery detectable.",
                  features: ["Integrity protection", "Tamper detection", "Cryptographic proofs"]
                }
              ].map((item, i) => (
                <Card key={i} className="hover:shadow-xl transition-shadow duration-300 border-t-4" style={{ borderTopColor: `rgb(${i * 30}, ${100 + i * 20}, ${200 - i * 10})` }}>
                  <CardContent className="h-full flex flex-col">
                    <div className={`mb-4 h-12 w-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{item.standard}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 mb-3 text-sm">{item.desc}</p>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700"><span className="font-semibold text-blue-900">Security: </span>{item.security}</p>
                    </div>
                    <div className="space-y-2 mt-auto">
                      {item.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

            {/* STRIDE Threat Modeling */}
        <section id="stride" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 mb-4">
                <AlertTriangle className="h-3 w-3 mr-2" />
                STRIDE Threat Model
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Security-First Design: STRIDE Analysis
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Every potential threat identified and mitigated through cryptographic and architectural controls
              </p>
            </div>

            <div className="max-w-6xl mx-auto space-y-6">
              {[
                {
                  letter: "S",
                  threat: "Spoofing",
                  scenario: "Fake Issuer Creates Fraudulent Credentials",
                  icon: UserX,
                  color: "bg-red-500",
                  mitigation: "Digital Signature Verification",
                  implementation: "Every credential includes an issuer_signature field verified against the issuer_did. Only the legitimate issuer's private key can create valid signatures. Forged credentials fail cryptographic verification.",
                  code: "issuer_signature: String // Cryptographically verified",
                  impact: "HIGH",
                  status: "MITIGATED"
                },
                {
                  letter: "T",
                  threat: "Tampering",
                  scenario: "Attacker Modifies IPFS Credential Data",
                  icon: Edit,
                  color: "bg-orange-500",
                  mitigation: "Cryptographic Hash Verification",
                  implementation: "credential_hash (SHA-256) stored on-chain. During verification, system recomputes hash of IPFS data and compares. Any tampering causes hash mismatch and verification failure.",
                  code: "if credential_hash != provided_hash { FAIL }",
                  impact: "HIGH",
                  status: "MITIGATED"
                },
                {
                  letter: "R",
                  threat: "Repudiation",
                  scenario: "Issuer Denies Having Issued Credential",
                  icon: FileText,
                  color: "bg-yellow-500",
                  mitigation: "Immutable On-Chain Event Logs",
                  implementation: "CredentialIssued events permanently recorded on blockchain with issuer address, timestamp, and credential details. Non-repudiable proof of issuance action.",
                  code: "emit CredentialIssued { issuer, timestamp, ... }",
                  impact: "MEDIUM",
                  status: "MITIGATED"
                },
                {
                  letter: "I",
                  threat: "Information Disclosure",
                  scenario: "Unauthorized Access to Credential Data",
                  icon: Lock,
                  color: "bg-green-500",
                  mitigation: "Role-Based Access Control (RBAC)",
                  implementation: "can_view_credential() checks: Only credential owner, issuer, or users with Auditor+ access level can view. Zero Trust: explicit authorization required for every read operation.",
                  code: "if caller_level < 3 && caller != holder { DENY }",
                  impact: "HIGH",
                  status: "MITIGATED"
                },
                {
                  letter: "D",
                  threat: "Denial of Service",
                  scenario: "Spam Credential Issuance Attack",
                  icon: Activity,
                  color: "bg-blue-500",
                  mitigation: "Rate Limiting + Gas Costs",
                  implementation: "Smart contract enforces 25 credentials/hour limit per address. Exceeding limit triggers RateLimitExceeded error and logs suspicious activity. Gas fees provide economic DoS protection.",
                  code: "if issue_count >= 25 { revert(RateLimitExceeded) }",
                  impact: "MEDIUM",
                  status: "MITIGATED"
                },
                {
                  letter: "E",
                  threat: "Elevation of Privilege",
                  scenario: "Regular User Becomes Issuer",
                  icon: Key,
                  color: "bg-purple-500",
                  mitigation: "Access Level Controls + Owner Authority",
                  implementation: "set_access_level() restricted to contract owner only. Credential issuance requires access_level >= 2. Unauthorized privilege escalation attempts logged as suspicious activity.",
                  code: "if caller != owner { revert(NotOwner) }",
                  impact: "CRITICAL",
                  status: "MITIGATED"
                }
              ].map((threat, i) => (
                <div key={i} className="group">
                  <Card className="hover:shadow-xl transition-all duration-300 border-l-4" style={{ borderLeftColor: threat.color.replace('bg-', '#') }}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        {/* Letter Badge */}
                        <div className={`shrink-0 h-16 w-16 ${threat.color} rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                          {threat.letter}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-bold text-gray-900">{threat.threat}</h3>
                                <threat.icon className="h-5 w-5 text-gray-500" />
                              </div>
                              <p className="text-sm text-gray-600 italic">"{threat.scenario}"</p>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                threat.impact === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                threat.impact === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {threat.impact}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                {threat.status}
                              </span>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold text-blue-900 text-sm">Mitigation Strategy</span>
                              </div>
                              <p className="text-sm text-gray-700 font-medium mb-2">{threat.mitigation}</p>
                              <p className="text-xs text-gray-600">{threat.implementation}</p>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-900 text-sm">Implementation</span>
                              </div>
                              <code className="block text-xs font-mono bg-gray-900 text-green-400 p-2 rounded">
                                {threat.code}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

     {/* The Problem Section */}
<section className="py-16 md:py-24 bg-white border-y border-gray-200">
  <div className="container mx-auto px-4 md:px-6">
    <div className="max-w-3xl mx-auto text-center mb-6">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
        Critical Problems in Traditional Credential Systems
      </h2>
      <p className="text-lg text-gray-600">
        Legacy approaches create serious security vulnerabilities and operational inefficiencies
      </p>
    </div>
    
    <div className="grid md:grid-cols-2 ml-[150px] gap-5">
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Key className="h-5 w-5 text-red-600" />
          </div>
          Static Credential Problem
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>ID Proofs, PDFs or certificates cannot be revoked in real-time</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Centralized databases create single points of failure</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>No built-in governance or audit trails</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Manual processes for employee onboarding/offboarding</span>
          </li>
        </ul>
      </div>
      
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          Security & Compliance Gaps
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>No cryptographic proof of credential authenticity</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Credentials can be forged or tampered without detection</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Incomplete audit trails fail compliance requirements</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Delayed revocation creates security windows for abuse</span>
          </li>
        </ul>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="h-5 w-5 text-red-600" />
          </div>
          Access Control Weaknesses
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>No granular role-based permission management</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Impossible to enforce time-bound access automatically</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Over-privileged accounts due to manual management</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>No real-time visibility into who has access to what</span>
          </li>
        </ul>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Database className="h-5 w-5 text-red-600" />
          </div>
          Operational Inefficiencies
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Hours or days to issue/revoke credentials manually</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>High administrative overhead for credential lifecycle</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>No automated verification for third parties</span>
          </li>
          <li className="flex items-start gap-3">
            <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <span>Vendor lock-in with proprietary credential formats</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>


        {/* Solutions Section */}
        <section id="solutions" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Enterprise Solutions
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Addressing critical access control challenges across industries
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Privileged Access Management",
                  icon: Key,
                  color: "bg-blue-100 text-blue-700",
                  desc: "Secure administrative access with real-time revocation capabilities."
                },
                {
                  title: "Employee Lifecycle",
                  icon: Users,
                  color: "bg-green-100 text-green-700",
                  desc: "Automate onboarding/offboarding with instant permission updates."
                },
                {
                  title: "DAO Governance",
                  icon: Building,
                  color: "bg-purple-100 text-purple-700",
                  desc: "Transparent voting rights and membership management."
                },
                {
                  title: "Academic Credentials",
                  icon: FileText,
                  color: "bg-orange-100 text-orange-700",
                  desc: "Issue verifiable diplomas with built-in expiration."
                },
                {
                  title: "Platform Security",
                  icon: Shield,
                  color: "bg-red-100 text-red-700",
                  desc: "Protect SaaS platforms with granular access controls."
                },
                {
                  title: "Supply Chain",
                  icon: Globe,
                  color: "bg-indigo-100 text-indigo-700",
                  desc: "Verify partner credentials in complex supply networks."
                },
                {
                  title: "Healthcare Access",
                  icon: ShieldCheck,
                  color: "bg-teal-100 text-teal-700",
                  desc: "Manage HIPAA-compliant access to sensitive data."
                },
                {
                  title: "Financial Compliance",
                  icon: Lock,
                  color: "bg-amber-100 text-amber-700",
                  desc: "Enforce SOX requirements with immutable audit trails."
                }
              ].map((solution, i) => (
                <div key={i} className="group">
                  <div className="h-full p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                    <div className={`inline-flex p-3 rounded-lg ${solution.color} mb-4`}>
                      <solution.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">{solution.title}</h3>
                    <p className="text-sm text-gray-600">{solution.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Casper Network */}
        <section className="py-16 md:py-24  bg-gray-900 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Casper Network?
              </h2>
              <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                The ideal foundation for enterprise-grade credential systems
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: "Upgradeable Contracts",
                  icon: RefreshCw,
                  desc: "Evolve your credential system without redeployment. Casper's unique contract upgradeability ensures long-term viability.",
                  highlight: "Future-proof architecture"
                },
                {
                  title: "Predictable Costs",
                  icon: Database,
                  desc: "Stable gas fees enable predictable operational costs for large-scale credential deployments.",
                  highlight: "Enterprise budgeting"
                },
                {
                  title: "Advanced Security",
                  icon: Shield,
                  desc: "Account-based model with sophisticated permission systems provides institutional-grade security.",
                  highlight: "Military-grade security"
                },
                {
                  title: "Developer Experience",
                  icon: Zap,
                  desc: "Comprehensive SDKs, clear documentation, and familiar programming models accelerate development.",
                  highlight: "Rapid deployment"
                }
              ].map((reason, i) => (
                <div key={i} className="relative">
                  <div className="absolute -top-4 -left-4 h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20" />
                  <div className="h-full p-6 rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                    <div className="mb-4 h-12 w-12 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                      <reason.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{reason.title}</h3>
                    <p className="text-gray-300 mb-3">{reason.desc}</p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium">
                      {reason.highlight}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20  bg-blue-100">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Access Control?
            </h2>
            <p className="text-xl  mb-5 max-w-2xl mx-auto">
              Join forward-thinking enterprises building secure, scalable credential systems on Casper.
            </p>
           
            
            {/* Contract Hash Reminder */}
            <div className=" pt-3 border-t border-blue-600/20">
              <p className=" mb-4">Live on Casper Network</p>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Database className="h-4 w-4" />
                <code className="text-sm font-mono ">
                  7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd
                </code>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 md:py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">CasperCredIQ</span>
              </div>
              <p className="text-sm text-gray-500">
                Enterprise-grade on-chain credential and access control infrastructure
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#technology" className="hover:text-white transition-colors">Technology</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Solutions</a></li>
                <li><a href="#contract" className="hover:text-white transition-colors">Smart Contract</a></li>
              </ul>
            </div>
            
            
            
            <div>
              <h4 className="text-white font-semibold mb-4">Use Cases</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-white transition-colors">Enterprise Access</li>
                <li className="hover:text-white transition-colors">DAO Governance</li>
                <li className="hover:text-white transition-colors">Academic Credentials</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-sm font-medium text-gray-500">
              © 2026 CasperCredIQ Protocol • Built for Enterprise Security on Casper Network
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Contract: 7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
