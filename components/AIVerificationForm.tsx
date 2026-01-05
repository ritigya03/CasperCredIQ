import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

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
}

interface VerificationResult {
  recommended: boolean;
  confidence: number;
  risk_level: string;
  explanation: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
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
    duration: ''
  });
  const AI_API_URL = process.env.AI_PUBLIC_API_URL || 'http://localhost:4000';
  const [errors, setErrors] = useState<Partial<Record<keyof VerificationFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [step, setStep] = useState<'form' | 'review' | 'result'>('form');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

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
    if (!formData.organization || formData.organization.length < 2) {
      newErrors.organization = 'Valid organization name is required';
    }
    if (!formData.duration) newErrors.duration = 'Duration is required';
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
          
          // Read as data URL for images, text for documents
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
    
    // Update supporting documents field
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
      const aiPayload = {
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        role: formData.role,
        organization: formData.organization,
        justification: formData.justification,
        duration: formData.duration,
        email: formData.email,
        phone: formData.phone,
        supportingDocuments: formData.supportingDocuments,
        hasFiles: uploadedFiles.length > 0
      };

      const response = await fetch(`${AI_API_URL} /ai-verify`, {
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
      setResult(data);
      setStep('result');
    } catch (error) {
      console.error('Verification failed:', error);
      alert(`Verification failed. Please ensure the backend server is running on ${AI_API_URL}`);
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

  const renderConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let color = 'bg-red-500';
    
    if (confidence >= 0.7) color = 'bg-green-500';
    else if (confidence >= 0.4) color = 'bg-yellow-500';
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-sm mb-1">
          <span>Confidence Score</span>
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
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Review Your Application</h2>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-600">Personal Details</h3>
              <p className="text-gray-800">{formData.name}</p>
              <p className="text-gray-800">{formData.age} years old</p>
              <p className="text-gray-800 capitalize">{formData.gender}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-600">Contact</h3>
              <p className="text-gray-800">{formData.email}</p>
              <p className="text-gray-800">{formData.phone}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600">Role Request</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-800"><strong>Role:</strong> {formData.role}</p>
              <p className="text-gray-800"><strong>Organization:</strong> {formData.organization}</p>
              <p className="text-gray-800"><strong>Duration:</strong> {formData.duration}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600">Justification</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-800 whitespace-pre-wrap">{formData.justification}</p>
            </div>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-600">Uploaded Files ({uploadedFiles.length})</h3>
              <div className="bg-gray-50 p-3 rounded space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-800">{file.name}</span>
                      <span className="text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
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
          <p className="text-gray-600 mb-4">Risk Level: <span className="font-semibold capitalize">{result.risk_level}</span></p>
        </div>
        
        {renderConfidenceBar(result.confidence)}
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">AI Analysis:</h3>
          <p className="text-gray-800">{result.explanation}</p>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-700 mb-1">Confidence Score</h4>
            <p className="text-2xl font-bold text-blue-800">{Math.round(result.confidence * 100)}%</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-700 mb-1">Risk Level</h4>
            <p className={`text-lg font-bold capitalize ${result.risk_level === 'high' || result.risk_level === 'critical' ? 'text-red-600' : result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
              {result.risk_level}
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Submit Another Request
          </button>
          {result.recommended && (
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex-1">
              Proceed to Issue Credentials
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Credential Verification Request</h1>
        <p className="text-gray-600">Complete this form for AI-powered verification of your credential request</p>
      </div>
      
      <div className="space-y-6">
        {/* Personal Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
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
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
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
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
              )}
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
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age}</p>
              )}
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
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
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
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        </div>
        
        {/* Credential Request Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Credential Request Details</h2>
          
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
                <option value="other">Other</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
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
                <option value="other">Other</option>
              </select>
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
              )}
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
            {errors.organization && (
              <p className="mt-1 text-sm text-red-600">{errors.organization}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Please provide the full, official name of the organization
            </p>
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
              placeholder="Explain in detail why you need this credential. Be specific about your responsibilities, tasks, and why this access is necessary for your work/studies."
            />
            {errors.justification && (
              <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Detailed justifications are more likely to be approved. Include specific tasks, projects, or responsibilities.
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
                <li>• All fields marked with * are required</li>
                <li>• AI verification typically takes 10-30 seconds</li>
                <li>• Provide specific, detailed justifications for better results</li>
                <li>• Use professional language and avoid inappropriate content</li>
                <li>• You'll have a chance to review before submission</li>
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