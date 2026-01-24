import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';

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
  credentialType: string;
  recipientPublicKey: string;
  validityDays: string;
  additionalMetadata: string;
  department: string;
  skills: string[];
}

interface VerificationResult {
  success: boolean;
  recommended: boolean;
  confidence: number;
  risk_level: string;
  explanation: string;
  requestId: string;
  timestamp: string;
  message: string;
  recommendation?: string;
  riskFactors?: string[];
  strengths?: string[];
  aiVerification?: {
    aiVerified: boolean;
    aiConfidence: number;
    aiJustification: string;
    verificationSource: string;
    verificationId: string;
    recommendation?: string;
    riskFactors?: string[];
    strengths?: string[];
  };
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

export default function AIVerificationForm() {
  const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caspercrediq-6.onrender.com' || 'http://localhost:3001';
  
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
    credentialType: 'employee',
    recipientPublicKey: '',
    validityDays: '30',
    additionalMetadata: '{}',
    department: '',
    skills: []
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof VerificationFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [step, setStep] = useState<'form' | 'review' | 'result'>('form');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [skillsInput, setSkillsInput] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VerificationFormData, string>> = {};
    
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
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.credentialType) newErrors.credentialType = 'Credential type is required';
    if (!formData.organization || formData.organization.length < 2) {
      newErrors.organization = 'Valid organization name is required';
    }
    if (!formData.duration) newErrors.duration = 'Duration is required';
    if (!formData.validityDays) newErrors.validityDays = 'Validity period is required';
    if (!formData.recipientPublicKey) {
      const demoKey = `demo_pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setFormData(prev => ({ ...prev, recipientPublicKey: demoKey }));
    }
    if (formData.justification.length < 20) {
      newErrors.justification = 'Please provide more details (minimum 20 characters)';
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
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting to backend:', BACKEND_API_URL);

      const aiPayload = {
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        role: formData.role,
        justification: formData.justification,
        age: formData.age,
        phone: formData.phone,
        gender: formData.gender,
        duration: formData.duration,
        credentialType: formData.credentialType
      };

      console.log('Sending AI verification request:', aiPayload);

      const aiResponse = await fetch(`${BACKEND_API_URL}/api/ai/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(aiPayload)
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI verification failed:', errorText);
        throw new Error('AI verification failed');
      }

      const aiVerificationData = await aiResponse.json();
      console.log('AI verification response:', aiVerificationData);

      // Extract the recommendation properly
      const aiVerification = aiVerificationData.aiVerification;
      const recommendation = aiVerification?.recommendation || 'REVIEW';
      const isApproved = recommendation === 'APPROVE';
      const aiConfidence = aiVerification?.aiConfidence || 0;
      
      // Determine risk level based on recommendation
      let riskLevel = 'medium';
      if (recommendation === 'REJECT') {
        riskLevel = 'high';
      } else if (recommendation === 'APPROVE') {
        riskLevel = 'low';
      }

      const requestPayload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        organization: formData.organization,
        justification: formData.justification,
        aiConfidence: aiConfidence,
        aiRecommendation: isApproved,
        aiJustification: aiVerification?.aiJustification || '',
        credentialType: formData.credentialType,
        recipientPublicKey: formData.recipientPublicKey || `demo_pk_${Date.now()}`,
        validityDays: formData.validityDays,
        department: formData.department,
        skills: formData.skills,
        age: formData.age,
        gender: formData.gender,
        phone: formData.phone,
        duration: formData.duration,
        supportingDocuments: formData.supportingDocuments,
        metadata: {
          skills: formData.skills,
          department: formData.department || 'General',
          justification: formData.justification.substring(0, 500),
          documents: uploadedFiles.map(f => f.name),
          age: formData.age,
          gender: formData.gender,
          phone: formData.phone,
          duration: formData.duration,
          verificationSource: aiVerification?.verificationSource || 'AI',
          verificationId: aiVerification?.verificationId || `VER_${Date.now()}`,
          recommendation: recommendation,
          riskFactors: aiVerification?.riskFactors || [],
          strengths: aiVerification?.strengths || []
        }
      };

      console.log('Submitting request payload:', requestPayload);

      const requestResponse = await fetch(`${BACKEND_API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!requestResponse.ok) {
        const errorText = await requestResponse.text();
        console.error('Request submission failed:', errorText);
        throw new Error(`Request submission failed: ${requestResponse.status}`);
      }

      const requestData = await requestResponse.json();
      console.log('Request submission response:', requestData);

      const finalResult: VerificationResult = {
        success: true,
        recommended: isApproved,
        confidence: aiConfidence,
        risk_level: riskLevel,
        explanation: aiVerification?.aiJustification || 'Application submitted',
        requestId: requestData.requestId || `REQ_${Date.now()}`,
        timestamp: new Date().toISOString(),
        message: isApproved 
          ? 'Your request has been approved by AI and is pending final issuer review'
          : recommendation === 'REJECT'
          ? 'Your request was flagged by AI verification. Manual review required.'
          : 'Your request requires manual review by an issuer',
        recommendation: recommendation,
        riskFactors: aiVerification?.riskFactors || [],
        strengths: aiVerification?.strengths || [],
        aiVerification: aiVerification
      };

      setResult(finalResult);
      setStep('result');
    } catch (error: any) {
      console.error('Submission failed:', error);
      alert(`Submission failed: ${error.message}`);
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
    if (step === 'result') {
      setStep('form');
      setResult(null);
    } else if (step === 'review') {
      setStep('form');
    }
  };

  const resetForm = () => {
    setFormData({
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
      credentialType: 'employee',
      recipientPublicKey: '',
      validityDays: '30',
      additionalMetadata: '{}',
      department: '',
      skills: []
    });
    setUploadedFiles([]);
    setSkillsInput('');
    setErrors({});
    setStep('form');
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
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Processing...
              </>
            ) : 'Submit for AI Verification'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'result' && result) {
    const getStatusColor = () => {
      if (result.recommendation === 'APPROVE') return 'green';
      if (result.recommendation === 'REJECT') return 'red';
      return 'yellow';
    };

    const getStatusText = () => {
      if (result.recommendation === 'APPROVE') return 'Approved by AI';
      if (result.recommendation === 'REJECT') return 'Rejected by AI';
      return 'Requires Review';
    };

    const statusColor = getStatusColor();
    const statusText = getStatusText();
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
            statusColor === 'green' ? 'bg-green-100' : 
            statusColor === 'red' ? 'bg-red-100' : 'bg-yellow-100'
          } mb-4`}>
            {statusColor === 'green' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : statusColor === 'red' ? (
              <X className="w-8 h-8 text-red-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
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
        
        {result.riskFactors && result.riskFactors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Risk Factors Identified:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {result.riskFactors.map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
        
        {result.strengths && result.strengths.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Positive Factors:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
              {result.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-700 mb-1">Confidence Score</h4>
            <p className="text-2xl font-bold text-blue-800">{Math.round(result.confidence * 100)}%</p>
            <p className="text-xs text-blue-600 mt-1">How sure AI is about its decision</p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-700 mb-1">Risk Level</h4>
            <p className={`text-lg font-bold capitalize ${
              result.risk_level === 'high' || result.risk_level === 'critical' ? 'text-red-600' : 
              result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {result.risk_level}
            </p>
          </div>
          <div className={`p-4 rounded ${
            statusColor === 'green' ? 'bg-green-50' :
            statusColor === 'red' ? 'bg-red-50' : 'bg-yellow-50'
          }`}>
            <h4 className={`font-semibold mb-1 ${
              statusColor === 'green' ? 'text-green-700' :
              statusColor === 'red' ? 'text-red-700' : 'text-yellow-700'
            }`}>Status</h4>
            <p className={`text-sm ${
              statusColor === 'green' ? 'text-green-800' :
              statusColor === 'red' ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {result.message}
            </p>
          </div>
        </div>
        
        
        
        <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">What happens next?</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Your request is now in the issuer's queue</li>
                <li>An admin will review your application and the AI analysis</li>
                {result.recommendation === 'APPROVE' && <li>Since AI approved your request, manual review should be quick</li>}
                {result.recommendation === 'REJECT' && <li className="font-semibold">AI flagged concerns - expect thorough manual review</li>}
                {result.recommendation === 'REVIEW' && <li>Manual review will determine final approval</li>}
                <li>If approved, your credential will be issued on the blockchain</li>
                <li>You'll receive an email with your credential details</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start">
            <ExternalLink className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 mb-2">✅ Request Submitted to Issuer Dashboard</h4>
              <p className="text-sm text-green-700 mb-2">
                Your request is now visible in the issuer dashboard and pending admin approval.
              </p>
              <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                <strong>Backend URL:</strong> {BACKEND_API_URL}<br/>
                <strong>Request ID:</strong> {result.requestId}<br/>
                <strong>API Endpoint:</strong> GET {BACKEND_API_URL}/api/requests<br/>
                <strong>Status:</strong> Pending Issuer Review
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition flex-1"
          >
            Submit Another Request
          </button>
          <button
            onClick={() => window.open(`${BACKEND_API_URL}/api/requests`, '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-1 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View All Requests (JSON)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Credential Verification Request</h1>
        <p className="text-gray-600 mb-4">Submit your request for AI-powered credential verification</p>
        <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          <CheckCircle className="w-4 h-4" />
          <span>Connected to backend: {BACKEND_API_URL}</span>
        </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
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
                Recipient Public Key
              </label>
              <input
                type="text"
                name="recipientPublicKey"
                value={formData.recipientPublicKey}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your public key or leave blank for demo"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to generate a demo key automatically
              </p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Engineering, HR, Research"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a role</option>
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="faculty">Faculty/Professor</option>
                <option value="researcher">Researcher</option>
                <option value="administrator">Administrator</option>
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
                <option value="engineer">Engineer</option>
                <option value="analyst">Analyst</option>
                <option value="consultant">Consultant</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain in detail why you need this credential, what you'll use it for, and any relevant background..."
            />
            {errors.justification && <p className="mt-1 text-sm text-red-600">{errors.justification}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Minimum 20 characters. Be specific about your responsibilities and needs.
            </p>
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
                <li>• Your request will be analyzed by Gemini 2.0 Flash AI</li>
                <li>• AI will check email legitimacy, role appropriateness, and justification quality</li>
                <li>• All requests are reviewed by human issuers regardless of AI recommendation</li>
                <li>• Approved credentials are stored on IPFS and Casper blockchain</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Submission */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4">
          <button
            onClick={handleReview}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Review Application
          </button>
          
          <div className="text-sm text-gray-500 text-center sm:text-right">
            <p>Fields marked with * are required</p>
            <p className="text-xs mt-1">AI-powered verification with Gemini 2.0 Flash</p>
          </div>
        </div>
      </div>
    </div>
  );
}