import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

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
  
  // Check if the origin is in the allowed list
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));

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
      'POST /ai-verify',
      'OPTIONS /ai-verify'
    ]
  });
});

// Your AI verification endpoint
app.post('/ai-verify', async (req, res) => {
  try {
    console.log('Received verification request:', {
      origin: req.headers.origin,
      body: req.body
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
    
    // Simple test logic
    if (cleanJustification.length > 100 && 
        cleanOrg.length > 3 && 
        !cleanOrg.includes('test')) {
      recommended = true;
      confidence = 0.8;
      risk_level = 'low';
      explanation = 'Request approved. The justification is detailed and the organization appears legitimate.';
    } else if (cleanJustification.length < 50) {
      recommended = false;
      confidence = 0.7;
      risk_level = 'high';
      explanation = 'Request denied: Justification is too brief. Please provide more details (minimum 50 characters).';
    } else {
      recommended = false;
      confidence = 0.6;
      risk_level = 'medium';
      explanation = 'Request requires additional clarification and specific details for approval.';
    }
    
    // Return response
    res.json({
      recommended,
      confidence,
      risk_level,
      explanation,
      debug: {
        received: true,
        origin: req.headers.origin,
        justificationLength: cleanJustification.length,
        organization: cleanOrg
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({
      recommended: false,
      confidence: 0,
      risk_level: 'critical',
      explanation: 'System error during verification. Please try again.',
      error: err.message
    });
  }
});

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
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AI Verification API - Railway Deployment');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 CORS configured for:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log('\n📡 Available endpoints:');
  console.log(`   GET  https://amusing-celebration-production.up.railway.app/health`);
  console.log(`   GET  https://amusing-celebration-production.up.railway.app/test`);
  console.log(`   POST https://amusing-celebration-production.up.railway.app/ai-verify`);
  console.log('\n💡 Testing commands:');
  console.log(`   curl https://amusing-celebration-production.up.railway.app/health`);
  console.log(`   curl -X OPTIONS https://amusing-celebration-production.up.railway.app/ai-verify -v`);
  console.log('='.repeat(60) + '\n');
});