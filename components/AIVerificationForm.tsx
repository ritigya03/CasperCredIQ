import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

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

export default function AIVerificationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<VerificationFormData>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [step, setStep] = useState<'form' | 'review' | 'result'>('form');

  const onSubmit = async (data: VerificationFormData) => {
    setLoading(true);
    try {
      // Prepare data for AI verification
      const aiPayload = {
        role: data.role,
        organization: data.organization,
        justification: data.justification
      };

      const response = await axios.post('http://localhost:4000/ai-verify', aiPayload);
      setResult(response.data);
      setStep('result');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setLoading(false);
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

  // Form review before submission
  const handleReview = (data: VerificationFormData) => {
    // Store form data
    sessionStorage.setItem('verificationData', JSON.stringify(data));
    setStep('review');
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
    const data = JSON.parse(sessionStorage.getItem('verificationData') || '{}');
    
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Review Your Application</h2>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-600">Personal Details</h3>
              <p className="text-gray-800">{data.name}</p>
              <p className="text-gray-800">{data.age} years old</p>
              <p className="text-gray-800">{data.gender}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-600">Contact</h3>
              <p className="text-gray-800">{data.email}</p>
              <p className="text-gray-800">{data.phone}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600">Role Request</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-800"><strong>Role:</strong> {data.role}</p>
              <p className="text-gray-800"><strong>Organization:</strong> {data.organization}</p>
              <p className="text-gray-800"><strong>Duration:</strong> {data.duration}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-600">Justification</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-800 whitespace-pre-wrap">{data.justification}</p>
            </div>
          </div>
          
          {data.supportingDocuments && (
            <div>
              <h3 className="font-semibold text-gray-600">Supporting Documents</h3>
              <p className="text-gray-800">{data.supportingDocuments}</p>
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
            onClick={() => onSubmit(data)}
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
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${statusColor}-100 mb-4`}>
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
            <p className={`text-lg font-bold capitalize ${result.risk_level === 'high' ? 'text-red-600' : result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
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
      
      <form onSubmit={handleSubmit(handleReview)} className="space-y-6">
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
                {...register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                {...register('gender', { required: 'Gender is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
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
                min="18"
                max="100"
                {...register('age', { 
                  required: 'Age is required',
                  min: { value: 18, message: 'Must be at least 18 years old' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25"
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[+]?[\d\s-]+$/,
                    message: 'Enter a valid phone number'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Enter a valid email address'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
                {...register('role', { required: 'Role is required' })}
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
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration Needed *
              </label>
              <select
                {...register('duration', { required: 'Duration is required' })}
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
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization/Institution *
            </label>
            <input
              type="text"
              {...register('organization', { 
                required: 'Organization is required',
                minLength: { value: 2, message: 'Organization name is too short' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Stanford University, Google Inc."
            />
            {errors.organization && (
              <p className="mt-1 text-sm text-red-600">{errors.organization.message}</p>
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
              {...register('justification', { 
                required: 'Justification is required',
                minLength: { value: 50, message: 'Please provide more details (minimum 50 characters)' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain in detail why you need this credential. Be specific about your responsibilities, tasks, and why this access is necessary for your work/studies."
            />
            {errors.justification && (
              <p className="mt-1 text-sm text-red-600">{errors.justification.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Detailed justifications are more likely to be approved. Include specific tasks, projects, or responsibilities.
            </p>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supporting Documents (Optional)
            </label>
            <textarea
              rows={3}
              {...register('supportingDocuments')}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List any supporting documents you can provide (e.g., enrollment proof, employment letter, project description). You may be asked to submit these later."
            />
          </div>
        </div>
        
        {/* Important Notes */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Important Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• All fields marked with * are required</li>
            <li>• AI verification typically takes 10-30 seconds</li>
            <li>• Provide specific, detailed justifications for better results</li>
            <li>• Use professional language and avoid inappropriate content</li>
            <li>• You'll have a chance to review before submission</li>
          </ul>
        </div>
        
        {/* Submission */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Review Application
          </button>
          
          <p className="text-sm text-gray-500">
            Fields marked with * are required
          </p>
        </div>
      </form>
    </div>
  );
}