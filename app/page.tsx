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
} from "lucide-react"
import Link from "next/link"
import WalletConnect from "../components/WalletConnect"
import { useRouter } from "next/navigation"

// Custom Button Component
const Button = ({ 
  children, 
  onClick, 
  variant = "default", 
  size = "default",
  className = "",
  disabled = false,
  type = "button"
}) => {
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
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

// Custom Card Component
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

const CardContent = ({ children, className = "" }) => {
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
                Enterprise-Grade On-Chain Access Control
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900">
                Beyond Static Credentials:
                <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Active Permissions on Chain
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
                CasperCredIQ transforms credentials from static documents into dynamic, enforceable permissions using 
                Role-Based Access Control (RBAC) on the Casper blockchain. Each credential represents a real-time 
                authorization decision — time-bound, auditable, and instantly revocable.
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
           
            
        {/* The Problem Section */}
        <section className="py-16 md:py-24 bg-white border-y border-gray-200">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Solving Real Security Problems
              </h2>
              <p className="text-lg text-gray-600">
                Traditional credential systems fail where it matters most: dynamic access control and instant revocation
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-20 ml-[8rem]">
              <div className="space-y-6">
                <h3 className="text-xl  font-bold text-gray-900 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Key className="h-5 w-5 text-red-600" />
                  </div>
                  The Static Credential Problem
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
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                  The CasperCredIQ Solution
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>Active permissions enforced on-chain via RBAC</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>Instant global revocation without delays</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>AI-assisted justification engine for safe issuance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span>Complete audit trail with time-bound permissions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Core Technology */}
        <section id="technology" className="py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Enterprise-Grade Technology Stack
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Combining AI decision support with decentralized, tamper-proof enforcement on Casper blockchain
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Role-Based Access Control (RBAC)",
                  icon: Users,
                  color: "from-blue-500 to-blue-600",
                  desc: "Foundational security concept implemented natively on-chain. Define roles like student, developer, moderator, or administrator with precise permissions.",
                  features: ["Granular permissions", "Least-privilege principle", "Role hierarchy"]
                },
                {
                  title: "AI Credential Justification",
                  icon: Cpu,
                  color: "from-purple-500 to-purple-600",
                  desc: "Evaluates user request context, justification, and risk before recommending approval. Maintains human oversight with issuer retaining final authority.",
                  features: ["Risk assessment", "Context evaluation", "Decision transparency"]
                },
                {
                  title: "Smart Contract Enforcement",
                  icon: FileText,
                  color: "from-green-500 to-green-600",
                  desc: "All authorization logic is executed through upgradeable smart contracts on Casper Network, ensuring tamper-proof enforcement.",
                  features: ["Upgradeable contracts", "Gas-efficient", "Transparent logic"]
                },
                {
                  title: "Time-Bound Credentials",
                  icon: Clock,
                  color: "from-orange-500 to-orange-600",
                  desc: "Set expiration dates and validity periods for all credentials. Automatic expiration without manual intervention.",
                  features: ["Automatic expiry", "Renewable permissions", "Temporal control"]
                },
                {
                  title: "Instant Revocation",
                  icon: RefreshCw,
                  color: "from-red-500 to-red-600",
                  desc: "Global revocation capabilities that take effect immediately across all systems. Perfect for emergency offboarding scenarios.",
                  features: ["Immediate effect", "Global scope", "Audit trail"]
                },
                {
                  title: "Public Verification",
                  icon: Globe,
                  color: "from-indigo-500 to-indigo-600",
                  desc: "Anyone can verify credential authenticity without needing API access or special permissions. Full transparency with privacy controls.",
                  features: ["Zero-knowledge proofs", "Public auditability", "Privacy-preserving"]
                }
              ].map((tech, i) => (
                <Card key={i} className="hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="h-full flex flex-col">
                    <div className={`mb-4 h-12 w-12 rounded-xl bg-gradient-to-r ${tech.color} flex items-center justify-center`}>
                      <tech.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">{tech.title}</h3>
                    <p className="text-gray-600 mb-4 flex-grow">{tech.desc}</p>
                    <div className="space-y-2">
                      {tech.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  desc: "Secure administrative access to critical systems with real-time revocation capabilities."
                },
                {
                  title: "Employee Lifecycle",
                  icon: Users,
                  color: "bg-green-100 text-green-700",
                  desc: "Automate onboarding and offboarding processes with instant permission updates."
                },
                {
                  title: "DAO Governance",
                  icon: Building,
                  color: "bg-purple-100 text-purple-700",
                  desc: "Transparent voting rights and membership management for decentralized organizations."
                },
                {
                  title: "Academic Credentials",
                  icon: FileText,
                  color: "bg-orange-100 text-orange-700",
                  desc: "Issue verifiable diplomas and certifications with built-in expiration and renewal."
                },
                {
                  title: "Platform Security",
                  icon: Shield,
                  color: "bg-red-100 text-red-700",
                  desc: "Protect SaaS platforms with granular access controls and audit trails."
                },
                {
                  title: "Supply Chain",
                  icon: Globe,
                  color: "bg-indigo-100 text-indigo-700",
                  desc: "Verify partner credentials and certifications in complex supply networks."
                },
                {
                  title: "Healthcare Access",
                  icon: ShieldCheck,
                  color: "bg-teal-100 text-teal-700",
                  desc: "Manage HIPAA-compliant access to sensitive patient data and systems."
                },
                {
                  title: "Financial Compliance",
                  icon: Lock,
                  color: "bg-amber-100 text-amber-700",
                  desc: "Enforce SOX and other regulatory requirements with immutable audit trails."
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