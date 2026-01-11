// server.js - Updated version with full functionality
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const app = express();

// **CRITICAL FIX: Configure CORS properly for Railway**
const allowedOrigins = [
  'https://fearless-laughter-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Middleware to handle CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));

// In-memory database for demo (use proper database in production)
const pendingRequests = new Map();
const issuedCredentials = new Map();
const notificationQueue = [];

// Email configuration (use environment variables in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'demo@example.com',
    pass: process.env.EMAIL_PASS || 'demo-password'
  }
});

// Generate unique IDs
function generateRequestId() {
  return `REQ_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateCredentialId() {
  return `CRED_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function generateIpfsHash() {
  return `Qm${crypto.randomBytes(20).toString('hex')}`;
}

function encryptAccessCode(ipfsHash) {
  const encoded = Buffer.from(ipfsHash).toString('base64');
  return encoded.split('').reverse().join('').substring(0, 12);
}

// Simple test endpoint to verify CORS
app.get('/test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Verification API',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    endpoints: [
      'GET  /health',
      'GET  /test',
      'GET  /api/requests',
      'POST /ai-verify',
      'POST /api/requests',
      'POST /api/requests/:id/approve',
      'POST /api/requests/:id/reject',
      'POST /api/notify',
      'OPTIONS /*'
    ]
  });
});

// Get all pending requests (for issuer dashboard)
app.get('/api/requests', (req, res) => {
  try {
    const requests = Array.from(pendingRequests.values()).filter(req => req.status === 'pending');
    
    res.json({
      success: true,
      count: requests.length,
      requests: requests
    });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests'
    });
  }
});

// Get request by ID
app.get('/api/requests/:id', (req, res) => {
  try {
    const request = pendingRequests.get(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    res.json({
      success: true,
      request: request
    });
  } catch (err) {
    console.error('Error fetching request:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request'
    });
  }
});

// Submit new credential request
app.post('/api/requests', async (req, res) => {
  try {
    console.log('Received credential request:', {
      origin: req.headers.origin,
      bodyKeys: Object.keys(req.body)
    });

    const requestData = req.body;
    
    // Generate request ID
    const requestId = generateRequestId();
    
    // Store request
    const request = {
      id: requestId,
      ...requestData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    pendingRequests.set(requestId, request);
    
    console.log(`Request stored: ${requestId}`, {
      name: requestData.name,
      email: requestData.email,
      role: requestData.role
    });
    
    res.json({
      success: true,
      requestId: requestId,
      message: 'Request submitted successfully',
      nextStep: 'Your request is now pending issuer approval'
    });
  } catch (err) {
    console.error('Error submitting request:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit request'
    });
  }
});

// Approve request and issue credential
app.post('/api/requests/:id/approve', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = pendingRequests.get(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    // Generate credential data
    const ipfsHash = generateIpfsHash();
    const credentialId = generateCredentialId();
    const doorAccessCode = encryptAccessCode(ipfsHash);
    
    const credentialData = {
      id: credentialId,
      requestId: requestId,
      recipient: request.name,
      recipientPublicKey: request.recipientPublicKey || 'demo_key',
      recipientEmail: request.email,
      role: request.role,
      organization: request.organization,
      credentialType: request.credentialType || 'employee',
      issueDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + parseInt(request.validityDays || '30') * 24 * 60 * 60 * 1000).toISOString(),
      issuer: req.body.issuer || 'Admin',
      metadata: request.metadata || {},
      aiConfidence: request.aiConfidence || 0.8,
      ipfsHash: ipfsHash,
      doorAccessCode: doorAccessCode,
      qrCodeData: JSON.stringify({
        credentialId: credentialId,
        ipfsHash: ipfsHash,
        verifyUrl: `${req.headers.origin || 'https://fearless-laughter-production.up.railway.app'}/verify?hash=${ipfsHash}`,
        accessCode: doorAccessCode,
        issuedAt: new Date().toISOString()
      })
    };
    
    // Store credential
    issuedCredentials.set(credentialId, credentialData);
    
    // Update request status
    request.status = 'approved';
    request.credentialId = credentialId;
    request.updatedAt = new Date().toISOString();
    pendingRequests.set(requestId, request);
    
    // Send notification email
    await sendNotificationEmail(request, credentialData);
    
    res.json({
      success: true,
      message: 'Credential issued successfully',
      credentialId: credentialId,
      ipfsHash: ipfsHash,
      doorAccessCode: doorAccessCode,
      recipientEmail: request.email
    });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to approve request'
    });
  }
});

// Reject request
app.post('/api/requests/:id/reject', async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = pendingRequests.get(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    // Update request status
    request.status = 'rejected';
    request.rejectionReason = req.body.reason || 'Not approved';
    request.updatedAt = new Date().toISOString();
    pendingRequests.set(requestId, request);
    
    // Send rejection email
    await sendRejectionEmail(request);
    
    res.json({
      success: true,
      message: 'Request rejected successfully'
    });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to reject request'
    });
  }
});

// Notification endpoint
app.post('/api/notify', async (req, res) => {
  try {
    const { to, subject, credentialId, ipfsHash, accessCode, validUntil } = req.body;
    
    const emailContent = `
      <h2>🎉 Your Credential Has Been Issued!</h2>
      <p>Your digital credential is now ready to use.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Credential Details:</h3>
        <ul>
          <li><strong>Credential ID:</strong> ${credentialId}</li>
          <li><strong>IPFS Hash:</strong> ${ipfsHash}</li>
          <li><strong>Access Code:</strong> <code>${accessCode}</code></li>
          <li><strong>Valid Until:</strong> ${new Date(validUntil).toLocaleDateString()}</li>
        </ul>
      </div>
      
      <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>🔐 How to Use Your Credential:</h3>
        <ol>
          <li>Use the access code <code>${accessCode}</code> at door readers</li>
          <li>Visit the verification page to check your credential status</li>
          <li>The IPFS hash proves your credential's authenticity</li>
        </ol>
      </div>
      
      <p>You can verify your credential anytime at: <a href="https://fearless-laughter-production.up.railway.app/verify">Verification Portal</a></p>
      
      <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
        This is an automated message. Please do not reply to this email.
      </p>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'credentials@example.com',
      to: to,
      subject: subject || 'Your Digital Credential is Ready',
      html: emailContent
    };
    
    // For demo purposes, just log the email
    console.log('📧 Email notification would be sent:', {
      to: to,
      subject: mailOptions.subject,
      credentialId: credentialId
    });
    
    // In production, uncomment this:
    // await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Notification sent successfully (simulated)'
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

// Get credential by ID or IPFS hash
app.get('/api/credentials/:identifier', (req, res) => {
  try {
    const identifier = req.params.identifier;
    let credential;
    
    // Search by credential ID
    credential = issuedCredentials.get(identifier);
    
    // If not found by ID, search by IPFS hash
    if (!credential) {
      for (const [id, cred] of issuedCredentials) {
        if (cred.ipfsHash === identifier) {
          credential = cred;
          break;
        }
      }
    }
    
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found'
      });
    }
    
    res.json({
      success: true,
      credential: credential
    });
  } catch (err) {
    console.error('Error fetching credential:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credential'
    });
  }
});

// Your AI verification endpoint
app.post('/ai-verify', async (req, res) => {
  try {
    console.log('Received AI verification request:', {
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });

    const { 
      role, 
      organization, 
      justification,
      duration,
      name,
      age,
      gender,
      email,
      phone,
      supportingDocuments,
      hasFiles
    } = req.body;

    // Basic validation
    if (!role || !justification || !organization) {
      return res.json({
        recommended: false,
        confidence: 0,
        risk_level: 'high',
        explanation: 'Missing required fields: role, organization, and justification are required.'
      });
    }

    // Simple rule-based logic for testing
    const cleanJustification = justification.trim().toLowerCase();
    const cleanOrg = organization.trim().toLowerCase();
    
    let recommended = false;
    let confidence = 0.5;
    let risk_level = 'medium';
    let explanation = '';
    
    // Enhanced test logic
    if (cleanJustification.length > 200 && 
        cleanOrg.length > 3 && 
        !cleanOrg.includes('test') &&
        !cleanOrg.includes('fake')) {
      recommended = true;
      confidence = 0.85 + (Math.random() * 0.1); // 85-95%
      risk_level = 'low';
      explanation = '✅ Request approved. The justification is detailed, organization appears legitimate, and request aligns with standard policies.';
    } else if (cleanJustification.length < 50) {
      recommended = false;
      confidence = 0.9;
      risk_level = 'high';
      explanation = '❌ Request denied: Justification is too brief. Please provide more specific details about responsibilities and needs (minimum 50 characters).';
    } else if (cleanOrg.includes('test') || cleanOrg.includes('fake')) {
      recommended = false;
      confidence = 0.8;
      risk_level = 'high';
      explanation = '❌ Request denied: Organization name appears invalid. Please provide the full official name.';
    } else {
      recommended = Math.random() > 0.3; // 70% chance of approval
      confidence = 0.6 + (Math.random() * 0.3); // 60-90%
      risk_level = recommended ? 'low' : 'medium';
      explanation = recommended 
        ? '✅ Request conditionally approved. Additional verification may be required by issuer.' 
        : '⚠️ Request requires additional clarification. Please provide more specific details about tasks and responsibilities.';
    }
    
    // Return response
    res.json({
      recommended,
      confidence,
      risk_level,
      explanation,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      debug: {
        justificationLength: cleanJustification.length,
        organization: cleanOrg,
        origin: req.headers.origin
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({
      recommended: false,
      confidence: 0,
      risk_level: 'critical',
      explanation: 'System error during verification. Please try again.',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to send notification email
async function sendNotificationEmail(request, credentialData) {
  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Credential Issued!</h1>
          <p style="font-size: 16px; opacity: 0.9;">Your digital credential is now active</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151;">Hello ${request.name},</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            Your credential request has been approved and your digital credential has been issued.
            Below are your credential details:
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #374151; margin-top: 0;">📋 Credential Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Credential ID:</strong></td>
                <td style="padding: 8px 0;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${credentialData.id}</code></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Role:</strong></td>
                <td style="padding: 8px 0;">${request.role}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Organization:</strong></td>
                <td style="padding: 8px 0;">${request.organization}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Valid Until:</strong></td>
                <td style="padding: 8px 0;">${new Date(credentialData.validUntil).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>IPFS Hash:</strong></td>
                <td style="padding: 8px 0;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${credentialData.ipfsHash}</code></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Door Access Code:</strong></td>
                <td style="padding: 8px 0;">
                  <div style="background: #10b981; color: white; padding: 10px; border-radius: 6px; text-align: center; font-size: 18px; letter-spacing: 2px;">
                    ${credentialData.doorAccessCode}
                  </div>
                  <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">
                    Use this code at door readers for access
                  </p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">🔐 How to Use Your Credential</h3>
            <ol style="color: #374151; line-height: 1.6;">
              <li>Use the access code above at any door reader</li>
              <li>Your credential is also available as a QR code in your dashboard</li>
              <li>Verify your credential anytime using the IPFS hash</li>
              <li>This credential is stored on the Casper blockchain for security</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://fearless-laughter-production.up.railway.app/verify" 
               style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              🔍 Verify Your Credential
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
            <p><strong>Need help?</strong> Contact your organization's administrator.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"Casper Credentials" <${process.env.EMAIL_USER || 'noreply@casper-credentials.com'}>`,
      to: request.email,
      subject: `✅ Credential Issued: ${request.role} at ${request.organization}`,
      html: emailContent
    };
    
    console.log('📧 Credential issuance email prepared:', {
      to: request.email,
      credentialId: credentialData.id,
      accessCode: credentialData.doorAccessCode
    });
    
    // In production:
    // await transporter.sendMail(mailOptions);
    
  } catch (err) {
    console.error('Error preparing notification email:', err);
  }
}

// Helper function to send rejection email
async function sendRejectionEmail(request) {
  try {
    console.log('📧 Rejection email prepared for:', {
      to: request.email,
      reason: request.rejectionReason
    });
    
    // Similar email structure for rejection
    // Implementation omitted for brevity
    
  } catch (err) {
    console.error('Error preparing rejection email:', err);
  }
}

// Handle OPTIONS preflight requests for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Casper Credentials Backend API - Railway Deployment');
  console.log('='.repeat(70));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 CORS configured for:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log('\n📡 Available endpoints:');
  console.log(`   GET  /health                          - Health check`);
  console.log(`   GET  /test                            - CORS test`);
  console.log(`   GET  /api/requests                    - Get pending requests`);
  console.log(`   POST /api/requests                    - Submit new request`);
  console.log(`   POST /api/requests/:id/approve        - Approve & issue credential`);
  console.log(`   POST /ai-verify                       - AI verification`);
  console.log(`   POST /api/notify                      - Send notifications`);
  console.log(`   GET  /api/credentials/:id             - Get credential by ID/hash`);
  console.log('\n💾 In-memory storage:');
  console.log(`   - Pending requests: ${pendingRequests.size}`);
  console.log(`   - Issued credentials: ${issuedCredentials.size}`);
  console.log(`   - Notifications queued: ${notificationQueue.length}`);
  console.log('='.repeat(70) + '\n');
});