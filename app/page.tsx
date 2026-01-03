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
} from "lucide-react"
import Link from "next/link"
import WalletConnect from "@/components/WalletConnect"
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
    default: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md",
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

export default function LandingPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleConnect = () => {
    setIsConnected(true)
  }

  const handleStart = () => {
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col font-sans bg-gradient-to-br from-blue-50 via-pink-50 to-green-50">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-blue-700">
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
            {["Features", "Use Cases", "Why Casper"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-blue-600 transition-colors"
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
              {["Features", "Use Cases", "Why Casper"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-blue-600 transition-colors"
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
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[120px] -z-10 animate-pulse" />
          <div
            className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-pink-100/50 blur-[120px] -z-10 animate-pulse"
            style={{ animationDelay: "2s" }}
          />

          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-8 md:mb-10">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
              Made using Casper Network
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 md:mb-8 mx-auto leading-[0.9] text-gray-900">
              On-Chain Credentials for{" "}
              <span className="text-blue-600 italic block sm:inline">
                Real-World Trust
              </span>
            </h1>
            <p className="max-w-2xl text-base md:text-lg text-gray-600 mb-8 md:mb-12 mx-auto leading-relaxed font-medium">
              Issue, verify, and revoke credentials directly on the Casper blockchain — secured by smart contracts and
              assisted by AI.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              {!isConnected ? (
                <Button
                  size="lg"
                  onClick={handleConnect}
                  className="h-12 md:h-14 rounded-2xl px-6 md:px-10 text-base md:text-lg font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-2xl"
                >
                  Connect Wallet 
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="h-12 md:h-14 rounded-2xl px-6 md:px-10 text-base md:text-lg font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-2xl"
                >
                  Get Started 
                </Button>
              )}
              <Button
  variant="outline"
  size="lg"
  onClick={() =>
    window.open(
      'https://github.com/ritigya03/CasperCredIQ',
      '_blank',
      'noopener,noreferrer'
    )
  }
  className="h-12 md:h-14 rounded-2xl px-6 md:px-10 text-base md:text-lg font-bold bg-white hover:bg-gray-50 border-gray-300 shadow-lg text-gray-700"
>
  View Resources
</Button>

            </div>
          </div>
        </section>

        {/* What is CasperCredIQ? */}
        <section className="bg-white/80 py-16 md:py-24 border-y border-gray-200">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:gap-12 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-balance leading-tight text-gray-900">
                  Decentralized Trust, Redefined.
                </h2>
                <div className="space-y-4 md:space-y-6 text-base md:text-lg text-gray-600 leading-relaxed">
                  <p>
                    CasperCredIQ shifts the paradigm of trust. Credentials are issued directly on-chain, eliminating the
                    need for vulnerable centralized databases.
                  </p>
                  <p className="font-medium text-gray-900 italic bg-blue-50 p-4 rounded-xl border border-blue-100">
                    "Think of it as a school or employee ID card — but on the blockchain."
                  </p>
                  <ul className="space-y-3 md:space-y-4">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-blue-500 shrink-0" />
                      <span>Tamper-proof and verifiable by anyone, anywhere.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-blue-500 shrink-0" />
                      <span>Instant global revocation without delays.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 text-blue-500 shrink-0" />
                      <span>Permanent transparency backed by Casper smart contracts.</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="relative flex justify-center">
                <div className="relative aspect-square w-full max-w-md rounded-2xl bg-gradient-to-br from-blue-50 to-pink-50 p-6 md:p-8 flex items-center justify-center border border-gray-300 shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl opacity-10">
                    <Database className="h-full w-full rotate-12 scale-150 text-blue-400" />
                  </div>
                  <div className="relative z-10 w-full rounded-xl bg-white p-4 md:p-6 shadow-2xl border border-gray-300">
                    <div className="mb-4 flex items-center justify-between border-b border-gray-300 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-pink-100" />
                        <div>
                          <div className="h-3 w-24 rounded bg-gray-300 mb-2" />
                          <div className="h-2 w-16 rounded bg-gray-200" />
                        </div>
                      </div>
                      <ShieldCheck className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-full rounded bg-gray-200" />
                      <div className="h-3 w-[80%] rounded bg-gray-200" />
                      <div className="h-3 w-[60%] rounded bg-gray-200" />
                    </div>
                    <div className="mt-6 flex justify-end">
                      <div className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        VERIFIED ON-CHAIN
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="py-16 md:py-24 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4 leading-tight text-gray-900">
                Powerful Features for Modern Issuers
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Built from the ground up to support high-stakes credential management with enterprise-grade reliability.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "On-Chain Issuance",
                  icon: ShieldCheck,
                  color: "bg-blue-100",
                  textColor: "text-blue-600",
                  desc: "Directly mint credentials onto the Casper blockchain as unique digital assets.",
                },
                {
                  title: "Transparent Revocation",
                  icon: History,
                  color: "bg-pink-100",
                  textColor: "text-pink-600",
                  desc: "Instant and permanent revocation records that are publicly verifiable.",
                },
                {
                  title: "Public Verification",
                  icon: Globe,
                  color: "bg-green-100",
                  textColor: "text-green-600",
                  desc: "Enable third parties to verify credential authenticity without needing private API access.",
                },
                {
                  title: "Upgradeable Contracts",
                  icon: Zap,
                  color: "bg-yellow-100",
                  textColor: "text-yellow-600",
                  desc: "Leverage Casper's native upgradeable smart contracts to evolve your credential system.",
                },
                {
                  title: "AI Justification",
                  icon: Cpu,
                  color: "bg-blue-100",
                  textColor: "text-blue-600",
                  desc: "Utilize AI to evaluate and document the reasoning behind credential awards.",
                },
                {
                  title: "Secure Account Model",
                  icon: Lock,
                  color: "bg-pink-100",
                  textColor: "text-pink-600",
                  desc: "Utilize Casper's advanced permission system for organizational management.",
                },
              ].map((f, i) => (
                <Card
                  key={i}
                  className="transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  <CardContent className="p-6 md:p-8">
                    <div
                      className={`mb-4 md:mb-6 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl ${f.color} ${f.textColor}`}
                    >
                      <f.icon className="h-6 w-6 md:h-7 md:w-7" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-900">{f.title}</h3>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section id="use-cases" className="bg-gradient-to-br from-pink-50 via-blue-50 to-green-50 py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4 leading-tight text-gray-900">
                Real-World Use Cases
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                From education to enterprise, CasperCredIQ delivers trust where it matters most.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Educational Institutions",
                  desc: "Issue tamper-proof diplomas and certifications that students can verify globally.",
                  color: "bg-blue-50",
                  borderColor: "border-blue-200",
                },
                {
                  title: "Corporate Training",
                  desc: "Track employee qualifications with blockchain-backed training records.",
                  color: "bg-green-50",
                  borderColor: "border-green-200",
                },
                {
                  title: "Professional Licensing",
                  desc: "Enable medical, legal, and other professionals to maintain verified credentials.",
                  color: "bg-pink-50",
                  borderColor: "border-pink-200",
                },
                {
                  title: "Supply Chain Verification",
                  desc: "Authenticate products and materials with transparent credential tracking.",
                  color: "bg-yellow-50",
                  borderColor: "border-yellow-200",
                },
                {
                  title: "Government Identity",
                  desc: "Secure digital IDs that citizens control and governments can verify.",
                  color: "bg-blue-50",
                  borderColor: "border-blue-200",
                },
                {
                  title: "Event Access Control",
                  desc: "Manage ticketing and exclusive access with revocable smart credentials.",
                  color: "bg-pink-50",
                  borderColor: "border-pink-200",
                },
              ].map((useCase, i) => (
                <div
                  key={i}
                  className={`${useCase.color} border ${useCase.borderColor} shadow-lg hover:shadow-xl transition-shadow rounded-xl p-6`}
                >
                  <h3 className="text-base md:text-lg font-bold mb-2 text-gray-900">{useCase.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{useCase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Casper */}
        <section id="why-casper" className="py-16 md:py-24 bg-white/80">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4 leading-tight text-gray-900">
                Why Casper Network?
              </h2>
              <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Casper's architecture provides the perfect foundation for enterprise credential systems.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
              <div className="bg-blue-50 border-blue-200 shadow-lg rounded-xl p-6 md:p-8">
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-3 text-gray-900">
                  <Zap className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                  Upgradeable Smart Contracts
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Unlike Ethereum, Casper allows you to upgrade smart contracts without redeploying. Your credential
                  system can evolve seamlessly as requirements change.
                </p>
              </div>
              <div className="bg-green-50 border-green-200 shadow-lg rounded-xl p-6 md:p-8">
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-3 text-gray-900">
                  <Lock className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                  Enterprise-Grade Security
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Casper's account-based model and advanced permission system provide institutional-grade security for
                  managing credentials at scale.
                </p>
              </div>
              <div className="bg-pink-50 border-pink-200 shadow-lg rounded-xl p-6 md:p-8">
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-3 text-gray-900">
                  <Database className="h-6 w-6 md:h-8 md:w-8 text-pink-600" />
                  Low, Predictable Costs
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Casper's gas fee model ensures predictable transaction costs, making large-scale credential
                  deployments financially sustainable.
                </p>
              </div>
              <div className="bg-yellow-50 border-yellow-200 shadow-lg rounded-xl p-6 md:p-8">
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-3 text-gray-900">
                  <Globe className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                  Developer-Friendly Tools
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Comprehensive SDKs and documentation make building on Casper accessible, even for teams new to
                  blockchain development.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-14 bg-blue-200">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
              Ready to Transform Trust?
            </h2>
            <p className="text-base md:text-lg  mb-8 md:mb-3 max-w-2xl mx-auto leading-relaxed">
              Join organizations worldwide that are building the future of verifiable credentials on Casper.
            </p>
          
          </div>
        </section>
      </main>

      <footer className="py-8 md:py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest">
            Made using <strong className="text-white">Casper</strong> • Decentralized Trust
          </p>
          <div className="h-px w-12 bg-blue-500/50 mx-auto" />
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium text-gray-600">
            © 2026 CasperCredIQ Protocol • Built for the Future
          </p>
        </div>
      </footer>
    </div>
  )
}