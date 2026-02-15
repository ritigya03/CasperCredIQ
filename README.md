# CasperCredIQ — AI-Powered Credential Issuance System

> **AI-gated, blockchain-enforced digital credentials**  
> *Ensuring every credential is justified, verifiable, and instantly revocable.*

---

## 🚀 Overview

**CasperCredIQ** is a next-generation **digital trust infrastructure** that combines **AI-driven verification** with **blockchain-enforced credentials**.

Unlike traditional systems that blindly issue credentials or permanently store unverified data on-chain, CasperCredIQ introduces a **two-step trust flow**:

> **AI first decides _whether_ a credential should exist — blockchain then guarantees it cannot be altered, forged, or silently revoked.**

Built on the **Casper Blockchain**, the platform enables fraud-resistant credential issuance with real-time verification, instant revocation, and full auditability — all while keeping **personally identifiable information (PII) off-chain**.

---

## 🎥 Demo Video

▶️ **Project Walkthrough**  
https://youtu.be/_pTulGHKk0s

---

## 🧠 How It Works

### Dual-Trust Verification System

User Request
↓
AI Verification (Google Gemini 2.5 Flash)
↓
Confidence Score + Risk Justification
↓
Issuer Approval
↓
On-Chain Credential (Casper)


1. Users submit a credential request  
2. AI evaluates legitimacy, fraud signals, and contextual risk  
3. A **0–100 confidence score** with reasoning is generated  
4. Issuer reviews AI output and approves or rejects  
5. Approved credentials are:
   - Hashed
   - Stored on encrypted IPFS
   - Minted on the Casper blockchain  
6. Credentials can be **verified, expired, or revoked instantly**

---

## ✨ Key Features

- 🤖 **AI-Powered Verification** — Multi-factor fraud detection with explainable confidence scoring  
- 🔗 **Blockchain Enforcement (Casper)** — Immutable credential records with cryptographic guarantees  
- ⚡ **Instant Revocation** — Revoked credentials become invalid across all systems in **≤0.1 seconds**  
- ⏱️ **Time-Bound Validity** — Automatic expiration with millisecond-precision timestamps  
- 🔐 **Privacy-Preserving by Design** — No PII stored on-chain, only cryptographic hashes  
- 📜 **Immutable Audit Trail** — Every action permanently logged on-chain  
- 🧩 **Multi-Issuer Architecture** — No single authority, W3C-aligned credential model  

---

## 🎯 Key Use Cases

### 🎓 Educational Credentials
- Prevents fake degrees and certificates  
- Employers verify credentials in **<100ms** via QR scan

### 🧑‍💻 Developer Verification
- AI analyzes GitHub contributions and activity  
- Skill badges issued as on-chain credentials

### 🏛️ DAO Governance
- Verified contributor credentials enforce voting rights  
- Transparent and fraud-resistant governance

### 🏥 Healthcare Compliance (HIPAA)
- Instant access revocation when employees leave  
- No sensitive medical data stored publicly

### 🎫 Event Access Control
- Time-bound, non-transferable credentials  
- Prevents ticket fraud and scalping

---

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript  
- Next.js 14  
- Tailwind CSS  
- Lucide React  
- Axios  

### Backend
- Node.js + Express.js  
- Google Gemini 2.5 Flash  
- Casper JS SDK  
- IPFS / Pinata  
- CORS  

### Blockchain
- Casper Network (PoS)  
- Rust / WASM Smart Contracts  
- Odra Framework  
- Casper Wallet  

### Storage
- IPFS (encrypted data)  
- Pinata  
- In-memory store (development)

---

## 🧪 Testing Instructions (Judges & Reviewers)

⚠️ **Access setup required — this is a security feature, not a limitation**

### Step 1: Provide Your Casper Public Key
- Required to grant **Issuer permissions**
- Public key starts with `01` or `02`

### Step 2: Access Levels
- **Level 0** — No access (default)  
- **Level 1** — Viewer (public data only)  
- **Level 2** — Issuer *(required for testing)*  
- **Level 3** — Auditor  
- **Level 4** — Owner (contract admin)

### Step 3: After Access Is Granted
You can:
- Submit credential requests  
- Review AI confidence & reasoning  
- Issue credentials on-chain  
- Verify credentials instantly  
- Revoke credentials in real time  
- Inspect immutable audit logs  

**Expected Performance**
- AI confidence score: **60–95%**  
- IPFS upload: **<2s**  
- Casper confirmation: **~30s**  
- Verification latency: **<100ms**

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 18+  
- Casper Wallet browser extension  
- Pinata account  

### Clone Repository
```bash
git clone https://github.com/ritigya03/CasperCredIQ
cd CasperCredIQ

npm install

npm run dev

```
## 🔮 Future Roadmap

### Short Term (3–6 months)
- Mobile QR credential scanner  
- Biometric confirmation before credential usage  
- Multi-chain support (Ethereum / Polygon)

### Long Term (1–2 years)
- Zero-knowledge selective disclosure  
- ML-driven fraud pattern learning  
- Decentralized credential marketplace  
- Cross-border compliance partnerships

---

## 🧾 Hackathon Disclosure

This project was **designed, built, and deployed exclusively for the Frostbyte Hackathon 2026**.  
All smart contracts, AI integrations, frontend components, and documentation represent original work created during the hackathon period.

---

## 🔗 Links

- 🌐 **Live Demo:** https://casper-cred-iq.vercel.app  
- 💻 **GitHub:** https://github.com/ritigya03/CasperCredIQ  
- 🎥 **Demo Video:** https://youtu.be/_pTulGHKk0s  

---

## 🧠 Final Note

**CasperCredIQ ensures credentials are not just verifiable — but justified.**  
By combining AI-based decision-making with blockchain-enforced trust, it eliminates crede
