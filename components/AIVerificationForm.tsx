"use-client"

import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, QrCode, Copy, Download } from 'lucide-react';

interface VerificationFormData {
  name: string;
  gender: string;
  age: string;
  role: string;
  organization: string;
  justification: string;
  supportingDocuments: string;
  email: string;
  phone: string;
  duration: string;
  // Additional fields for credential issuance
  credentialType: string;
  recipientPublicKey: string;
  validityDays: string;
  additionalMetadata: string;
  department: string;
  skills: string[];
}

interface VerificationResult {
  recommended: boolean;
  confidence: number;
  risk_level: string;
  explanation: string;
  requestId: string;
  timestamp: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

interface IssuedCredential {
  ipfsHash: string;
  credentialId: string;
  qrCodeData: string;
  issueDate: string;
  validUntil: string;
  doorAccessCode: string;
  issuerPublicKey: string;
}

export default function AIVerificationForm() {
  const [formData, setFormData] = useState<VerificationFormData>({
    name: '',
    gender: '',
    age: '',
    role: '',
    organization: '',
    justification: '',
    supportingDocuments: '',
    email: '',
    phone: '',
    duration: '',
    credentialType: '',
    recipientPublicKey: '',
    validityDays: '30',
    additionalMetadata: '{}',
    department: '',
    skills: []
  });
  
  const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:4000';
  const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  
  const [errors, setErrors] = useState<Partial<Record<keyof VerificationFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [step, setStep] = useState<'form' | 'review' | 'result' | 'issued'>('form');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredential | null>(null);
  const [skillsInput, setSkillsInput] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VerificationFormData, string>> = {};
    
    // Personal info validation
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 18) {
      newErrors.age = 'Must be at least 18 years old';
    }
    if (!formData.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.phone.match(/^[+]?[\d\s-]+$/)) {
      newErrors.phone = 'Enter a valid phone number';
    }
    
    // Credential info validation
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.credentialType) newErrors.credentialType = 'Credential type is required';
    if (!formData.organization || formData.organization.length < 2) {
      newErrors.organization = 'Valid organization name is required';
    }
    if (!formData.duration) newErrors.duration = 'Duration is required';
    if (!formData.validityDays) newErrors.validityDays = 'Validity period is required';
    if (!formData.recipientPublicKey || formData.recipientPublicKey.length < 10) {
      newErrors.recipientPublicKey = 'Valid public key is required (or enter 0 for demo)';
    }
    if (formData.justification.length < 50) {
      newErrors.justification = 'Please provide more details (minimum 50 characters)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof VerificationFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const addSkill = () => {
    if (skillsInput.trim() && !formData.skills.includes(skillsInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillsInput.trim()]
      }));
      setSkillsInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      try {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          
          if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
          } else {
            reader.readAsText(file);
          }
        });

        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: content
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        alert(`Failed to read file ${file.name}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    const fileList = [...uploadedFiles, ...newFiles].map(f => f.name).join(', ');
    setFormData(prev => ({ 
      ...prev, 
      supportingDocuments: fileList 
    }));
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    const fileList = newFiles.map(f => f.name).join(', ');
    setFormData(prev => ({ 
      ...prev, 
      supportingDocuments: fileList 
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      // Prepare metadata
      const metadata = {
        skills: formData.skills,
        department: formData.department || 'General',
        justification: formData.justification,
        documents: uploadedFiles.map(f => f.name)
      };

      const aiPayload = {
        ...formData,
        additionalMetadata: JSON.stringify(metadata),
        hasFiles: uploadedFiles.length > 0,
        requestTimestamp: new Date().toISOString()
      };

      // Send to AI verification
      const response = await fetch(`${AI_API_URL}/ai-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiPayload)
      });

      if (!response.ok) {
        throw new Error('Verification request failed');
      }

      const data = await response.json();
      const resultWithId = {
        ...data,
        requestId: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
      setResult(resultWithId);

      // Send request to issuer queue
      await fetch(`${BACKEND_API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          metadata,
          aiResult: resultWithId,
          status: 'pending',
          submittedAt: new Date().toISOString()
        })
      });

      setStep('result');
    } catch (error) {
      console.error('Verification failed:', error);
      alert(`Verification failed. Please ensure the backend server is running on ${AI_API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateIssuance = async () => {
    // This would normally be done by the issuer, but we'll simulate it for demo
    setLoading(true);
    
    try {
      // Generate demo credential data
      const credentialData = {
        id: `CRED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipient: formData.name,
        recipientPublicKey: formData.recipientPublicKey || 'demo_public_key',
        role: formData.role,
        organization: formData.organization,
        issueDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + parseInt(formData.validityDays) * 24 * 60 * 60 * 1000).toISOString(),
        issuer: 'Admin',
        metadata: JSON.parse(formData.additionalMetadata || '{}'),
        aiConfidence: result?.confidence || 0
      };

      // Simulate IPFS storage
      const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`;
      
      // Generate door access code (encrypted version of IPFS hash)
      const doorAccessCode = btoa(ipfsHash).split('').reverse().join('').substr(0, 12);
      
      // Generate QR code data
      const qrData = JSON.stringify({
        credentialId: credentialData.id,
        ipfsHash: ipfsHash,
        verifyUrl: `${window.location.origin}/verify?hash=${ipfsHash}`,
        accessCode: doorAccessCode
      });

      const issuedCred: IssuedCredential = {
        ipfsHash,
        credentialId: credentialData.id,
        qrCodeData: qrData,
        issueDate: credentialData.issueDate,
        validUntil: credentialData.validUntil,
        doorAccessCode,
        issuerPublicKey: 'demo_issuer_public_key'
      };

      setIssuedCredential(issuedCred);
      
      // Send notification email (simulated)
      await fetch(`${BACKEND_API_URL}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.email,
          subject: 'Your Credential Has Been Issued',
          credentialId: credentialData.id,
          ipfsHash: ipfsHash,
          accessCode: doorAccessCode,
          validUntil: credentialData.validUntil
        })
      });

      setStep('issued');
    } catch (error) {
      console.error('Issuance simulation failed:', error);
      alert('Failed to simulate credential issuance');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = () => {
    if (validateForm()) {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'result' || step === 'issued') {
      setStep('form');
      setResult(null);
      setIssuedCredential(null);
    } else if (step === 'review') {
      setStep('form');
    }
  };

  const renderConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let color = 'bg-red-500';
    
    if (confidence >= 0.7) color = 'bg-green-500';
    else if (confidence >= 0.4) color = 'bg-yellow-500';
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-sm mb-1">
          <span>AI Confidence Score</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`${color} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (step === 'review') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Review Your Application</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-600 mb-3">Personal Details</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Age:</strong> {formData.age} years</p>
                <p><strong>Gender:</strong> {formData.gender}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-600 mb-3">Credential Details</h3>
              <div className="space-y-2">
                <p><strong>Credential Type:</strong> {formData.credentialType}</p>
                <p><strong>Public Key:</strong> {formData.recipientPublicKey.substring(0, 20)}...</p>
                <p><strong>Validity:</strong> {formData.validityDays} days</p>
                <p><strong>Department:</strong> {formData.department || 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-600 mb-3">Role Request</h3>
              <div className="space-y-2">
                <p><strong>Role:</strong> {formData.role}</p>
                <p><strong>Organization:</strong> {formData.organization}</p>
                <p><strong>Duration:</strong> {formData.duration}</p>
              </div>
            </div>
            
            {formData.skills.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-600 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-600 mb-3">Justification</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{formData.justification}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Edit Information
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-1"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Submit for AI Verification'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
    const statusColor = result.recommended ? 'green' : 'red';
    const statusText = result.recommended ? 'Recommended' : 'Not Recommended';
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${result.recommended ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
            {result.recommended ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            AI Verification Result: <span className={`text-${statusColor}-600`}>{statusText}</span>
          </h2>
          <p className="text-gray-600 mb-4">Request ID: <code className="bg-gray-100 px-2 py-1 rounded">{result.requestId}</code></p>
        </div>
        
        {renderConfidenceBar(result.confidence)}
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">AI Analysis:</h3>
          <p className="text-gray-800">{result.explanation}</p>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-700 mb-1">Confidence Score</h4>
            <p className="text-2xl font-bold text-blue-800">{Math.round(result.confidence * 100)}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-700 mb-1">Risk Level</h4>
            <p className={`text-lg font-bold capitalize ${result.risk_level === 'high' || result.risk_level === 'critical' ? 'text-red-600' : result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
              {result.risk_level}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <h4 className="font-semibold text-green-700 mb-1">Next Step</h4>
            <p className="text-sm text-green-800">
              Your request has been sent to issuers. You'll be notified when your credential is issued.
            </p>
          </div>
        </div>
        
        <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">What happens next?</h4>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Your request is now in the issuer's queue</li>
            <li>An admin will review your application</li>
            <li>If approved, they will issue your credential</li>
            <li>You'll receive an email with your credential details</li>
            <li>You can use the QR code and access code to unlock doors</li>
          </ol>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Submit Another Request
          </button>
          <button
            onClick={() => window.location.href = '/verify'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex-1"
          >
            Check Verification Status
          </button>
        </div>
      </div>
    );
  }

  if (step === 'issued' && issuedCredential) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800">🎉 Credential Successfully Issued!</h2>
          <p className="text-gray-600">Your digital credential is ready to use</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* QR Code and Access Code */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-center mb-4">
              <QrCode className="w-24 h-24 mx-auto mb-4 text-gray-800" />
              <h3 className="font-semibold text-gray-700 mb-2">Door Access QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">Scan this at door readers for access</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={issuedCredential.doorAccessCode}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white"
                  />
                  <button
                    onClick={() => copyToClipboard(issuedCredential.doorAccessCode)}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This encrypted code unlocks doors. Keep it secure!
                </p>
              </div>
            </div>
          </div>

          {/* Credential Details */}
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">📧 Notification Sent</h3>
              <p className="text-sm text-green-700">
                A notification has been sent to {formData.email} with all credential details.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-3">Credential Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Credential ID:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{issuedCredential.credentialId}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IPFS Hash:</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{issuedCredential.ipfsHash.substring(0, 20)}...</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valid Until:</span>
                  <span className="font-medium">{new Date(issuedCredential.validUntil).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Issued By:</span>
                  <span className="font-medium">Administrator</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">🔐 How to Use</h3>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Use the QR code or access code at door readers</li>
                <li>Your access is linked to your public key</li>
                <li>Verify your credential anytime at /verify</li>
                <li>The IPFS hash proves your credential's authenticity</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Request Another Credential
          </button>
          <button
            onClick={() => copyToClipboard(JSON.stringify(issuedCredential))}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-1"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export Credential Data
          </button>
          <button
            onClick={() => window.location.href = '/verify'}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Verify Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Credential Verification Request</h1>
        <p className="text-gray-600">Submit your request for AI-powered credential verification</p>
      </div>
      
      <div className="space-y-8">
        {/* Personal Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age *
              </label>
              <input
                type="number"
                name="age"
                min="18"
                max="100"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25"
              />
              {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
        </div>
        
        {/* Credential Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Credential Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credential Type *
              </label>
              <select
                name="credentialType"
                value={formData.credentialType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="employee">Employee ID</option>
                <option value="student">Student ID</option>
                <option value="visitor">Visitor Pass</option>
                <option value="contractor">Contractor Badge</option>
                <option value="admin">Administrator</option>
                <option value="faculty">Faculty</option>
              </select>
              {errors.credentialType && <p className="mt-1 text-sm text-red-600">{errors.credentialType}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Public Key *
              </label>
              <input
                type="text"
                name="recipientPublicKey"
                value={formData.recipientPublicKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Blabcl23... or 0 for demo"
              />
              {errors.recipientPublicKey && <p className="mt-1 text-sm text-red-600">{errors.recipientPublicKey}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validity Period (Days) *
              </label>
              <select
                name="validityDays"
                value={formData.validityDays}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
              {errors.validityDays && <p className="mt-1 text-sm text-red-600">{errors.validityDays}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Engineering, HR, Research"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a skill and press Enter"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              >
                Add
              </button>
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Role Request */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Role Request Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requested Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a role</option>
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="faculty">Faculty/Professor</option>
                <option value="researcher">Researcher</option>
                <option value="administrator">Administrator</option>
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
              </select>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration Needed *
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select duration</option>
                <option value="30-days">30 Days</option>
                <option value="90-days">90 Days</option>
                <option value="6-months">6 Months</option>
                <option value="1-year">1 Year</option>
                <option value="permanent">Permanent</option>
              </select>
              {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization/Institution *
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Stanford University, Google Inc."
            />
            {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization}</p>}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you need this role? *
            </label>
            <textarea
              rows={4}
              name="justification"
              value={formData.justification}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain in detail why you need this credential..."
            />
            {errors.justification && <p className="mt-1 text-sm text-red-600">{errors.justification}</p>}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Documents (Optional)
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  PDF, DOC, TXT, JPG, PNG (Max 5MB per file)
                </span>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-blue-50 p-3 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Important Notes */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Important Information</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your request will be reviewed by an AI system first</li>
                <li>• Approved requests go to issuer dashboard for final approval</li>
                <li>• You'll receive email notification when credential is issued</li>
                <li>• Your credential includes a QR code and door access code</li>
                <li>• All credentials are stored on IPFS and Casper blockchain</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Submission */}
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={handleReview}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Review Application
          </button>
          
          <p className="text-sm text-gray-500">
            Fields marked with * are required
          </p>
        </div>
      </div>
    </div>
  );
}