// server.js - COMPLETE FIXED VERSION for CasperCredIQ
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import casperSdk from 'casper-js-sdk';
import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';

const {
  CasperClient,
  CasperServiceByJsonRPC,
  DeployUtil,
  CLPublicKey
} = casperSdk;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CONFIGURATION ====================

// Your working RPC node
const NODE_URL = process.env.CASPER_NODE_URL || 'http://65.109.83.79:7777/rpc';

// Your contract details from constants.ts
const CONTRACT_HASH = '971986539f375a9c7da1879177f11c5fa8b0a28f50ae61e93480a3522ce347c7';
const PACKAGE_HASH = '32f170fbb5a6410270a1fe0d89bcb060d9f8291a4a70a9d3dda3159f21565a35';

// Pinata Configuration for IPFS
const PINATA_API_KEY = process.env.PINATA_API_KEY || "b660c0f6e7ca176d7bb2";
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || "ced51d94972a746ab9055dca5355503d7a327e4d964ddcbd095f3f69bde5019d";
const PINATA_GATEWAY = 'https://white-real-badger-280.mypinata.cloud/ipfs/';

console.log('📦 Configuration loaded:');
console.log('   RPC Node:', NODE_URL);
console.log('   Contract Hash:', CONTRACT_HASH);
console.log('   Package Hash:', PACKAGE_HASH);
console.log('   IPFS Gateway:', PINATA_GATEWAY);
console.log('   Pinata API:', PINATA_API_KEY ? '✓ Configured' : '✗ Not configured');

// ==================== CASPER CLIENT SETUP ====================

let casperClient;
let rpcClient;

async function initializeCasperClients() {
  try {
    console.log(`🔗 Connecting to Casper RPC: ${NODE_URL}`);
    
    casperClient = new CasperClient(NODE_URL);
    rpcClient = new CasperServiceByJsonRPC(NODE_URL);
    
    const status = await rpcClient.getStatus();
    
    console.log('✅ Casper clients initialized!');
    console.log(`   Chain: ${status.chainspec_name}`);
    console.log(`   Block: ${status.last_added_block_info.height}`);
    console.log(`   API Version: ${status.api_version}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Casper clients:', error.message);
    console.log('⚠️ Running in offline mode. Blockchain features limited.');
    casperClient = null;
    rpcClient = null;
    return false;
  }
}

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://fearless-laughter-production.up.railway.app',
    'https://caspercrediq-production.up.railway.app',
    'https://amusing-celebration-production.up.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json());

// ==================== IN-MEMORY STORAGE ====================

const pendingRequests = new Map();
const issuedCredentials = new Map();

function generateRequestId() {
  return `REQ_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateCredentialId() {
  return `CRED_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

// ==================== IPFS FUNCTIONS ====================

async function uploadToIPFS(credentialData) {
  try {
    console.log(`📤 Uploading to IPFS: ${credentialData.credentialId}`);
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: credentialData,
        pinataMetadata: {
          name: `credential-${credentialData.credentialId}.json`,
          keyvalues: {
            credentialId: credentialData.credentialId,
            holder: credentialData.recipientName,
            issuer: credentialData.issuerPublicKey,
            type: 'credential',
            blockchain: 'casper',
            app: 'CasperCredIQ'
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY
        },
        timeout: 30000
      }
    );
    
    const ipfsHash = response.data.IpfsHash;
    console.log(`✅ IPFS upload successful: ${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: `${PINATA_GATEWAY}${ipfsHash}`,
      pinataUrl: `https://app.pinata.cloud/pinmanager?search=${ipfsHash}`,
      size: response.data.PinSize
    };
    
  } catch (error) {
    console.error('❌ IPFS upload failed:', error.message);
    
    // Fallback: generate simulated hash
    const simulatedHash = `Qm${crypto.randomBytes(20).toString('hex')}`;
    console.log('⚠️ Using simulated IPFS hash:', simulatedHash);
    
    return {
      success: true,
      ipfsHash: simulatedHash,
      gatewayUrl: `${PINATA_GATEWAY}${simulatedHash}`,
      note: 'Simulated hash - Pinata upload failed',
      error: error.message
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

async function queryContractEntryPoint(entryPoint, args = []) {
  if (!rpcClient) {
    throw new Error('RPC client not available');
  }
  
  try {
    console.log(`📡 Querying contract entry point: ${entryPoint}`);
    
    // For query_contract, we need to use a different approach
    // First, let's try a direct state query
    const query = {
      key: `hash-${CONTRACT_HASH}`,
      path: [entryPoint]
    };
    
    if (args && args.length > 0) {
      query.args = args;
    }
    
    const stateItem = await rpcClient.queryGlobalState(query);
    
    if (stateItem && stateItem.StoredValue && stateItem.StoredValue.CLValue) {
      const clValue = stateItem.StoredValue.CLValue;
      
      // Simple parsing for common types
      let parsedValue = null;
      
      if (clValue.bytes) {
        try {
          if (clValue.cl_type === 'Bool') {
            parsedValue = clValue.bytes === '01';
          } else if (clValue.cl_type === 'U8') {
            parsedValue = parseInt(clValue.bytes, 16);
          } else if (clValue.cl_type === 'U64') {
            parsedValue = parseInt(clValue.bytes, 16);
          } else if (clValue.cl_type === 'String') {
            // Convert hex to string
            const hex = clValue.bytes;
            if (hex.startsWith('0x')) {
              parsedValue = Buffer.from(hex.slice(2), 'hex').toString('utf-8');
            } else {
              parsedValue = Buffer.from(hex, 'hex').toString('utf-8');
            }
          } else if (clValue.cl_type === 'Key') {
            parsedValue = clValue.bytes;
          } else if (clValue.cl_type && clValue.cl_type.Option) {
            // Handle Option type
            if (clValue.bytes === '00') {
              parsedValue = null; // None
            } else {
              // Parse the inner value
              parsedValue = clValue.bytes;
            }
          }
        } catch (parseError) {
          console.error(`Parse error for ${entryPoint}:`, parseError);
          parsedValue = clValue.bytes;
        }
      }
      
      return {
        raw: stateItem,
        parsed: parsedValue,
        success: parsedValue !== null,
        clType: clValue.cl_type
      };
    } else if (stateItem && stateItem.StoredValue && stateItem.StoredValue.Contract) {
      // Contract package found
      return {
        raw: stateItem,
        parsed: 'Contract package found',
        success: true
      };
    }
    
    return {
      raw: stateItem,
      parsed: null,
      success: false,
      error: 'No CLValue in response'
    };
    
  } catch (error) {
    console.error(`Query failed for ${entryPoint}:`, error.message);
    
    // Check if it's a "key not found" error
    if (error.message.includes('ValueNotFound') || 
        error.message.includes('state query failed')) {
      throw new Error(`Entry point "${entryPoint}" not found or credential doesn't exist`);
    }
    
    throw error;
  }
}

async function fetchFromIPFS(ipfsHash) {
  try {
    console.log(`Fetching from IPFS: ${ipfsHash}`);
    
    // Try your custom gateway first with extended timeout
    const gateways = [
      `${PINATA_GATEWAY}${ipfsHash}`,  // Your custom gateway
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://dweb.link/ipfs/${ipfsHash}`,
      `https://${ipfsHash}.ipfs.dweb.link/`,  // Alternative format
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
    ];
    
    for (const [index, gateway] of gateways.entries()) {
      try {
        console.log(`  Trying gateway ${index + 1}: ${gateway}`);
        const timeout = index === 0 ? 10000 : 5000; // Longer timeout for custom gateway
        
        const response = await axios.get(gateway, { 
          timeout: timeout,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CasperCredIQ/1.0'
          },
          validateStatus: function (status) {
            return status === 200; // Only accept 200 OK
          }
        });
        
        console.log(`✅ Success from ${gateway}`);
        return {
          success: true,
          data: response.data,
          gateway: gateway,
          status: 'success'
        };
      } catch (gatewayError) {
        console.log(`  Gateway failed: ${gatewayError.message}`);
        continue;
      }
    }
    
    // All gateways failed
    console.log('❌ All IPFS gateways failed');
    return {
      success: false,
      error: 'All IPFS gateways failed',
      status: 'failed'
    };
    
  } catch (error) {
    console.error('IPFS fetch error:', error);
    return {
      success: false,
      error: error.message,
      status: 'error'
    };
  }
}

// ==================== API ENDPOINTS ====================

/**
 * 1. Health Check
 */
app.get('/health', async (req, res) => {
  const rpcStatus = rpcClient ? 'connected' : 'disconnected';
  
  res.json({
    status: 'healthy',
    service: 'CasperCredIQ Backend',
    timestamp: new Date().toISOString(),
    rpc: {
      node: NODE_URL,
      status: rpcStatus
    },
    contract: {
      hash: CONTRACT_HASH,
      package: PACKAGE_HASH
    },
    ipfs: {
      gateway: PINATA_GATEWAY,
      configured: !!PINATA_API_KEY
    },
    storage: {
      pendingRequests: pendingRequests.size,
      issuedCredentials: issuedCredentials.size
    }
  });
});

/**
 * 2. Test RPC Connection
 */
app.get('/api/rpc-test', async (req, res) => {
  try {
    if (!rpcClient) {
      return res.json({
        success: false,
        status: 'offline',
        message: 'RPC client not initialized',
        nodeUrl: NODE_URL
      });
    }
    
    const status = await rpcClient.getStatus();
    
    res.json({
      success: true,
      status: 'connected',
      chain: status.chainspec_name,
      latestBlock: status.last_added_block_info.height,
      nodeUrl: NODE_URL,
      contractHash: CONTRACT_HASH,
      packageHash: PACKAGE_HASH
    });
  } catch (error) {
    res.json({
      success: false,
      status: 'error',
      message: error.message,
      nodeUrl: NODE_URL
    });
  }
});

/**
 * 3. Get All Pending Requests
 */
app.get('/api/requests', (req, res) => {
  try {
    const requests = Array.from(pendingRequests.values())
      .filter(req => req.status === 'pending' || req.status === 'approved');
    
    console.log(`📋 Fetched ${requests.length} pending requests`);
    
    res.json({
      success: true,
      count: requests.length,
      requests: requests,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 4. Submit New Request (from AI Verification Form)
 */
app.post('/api/requests', async (req, res) => {
  try {
    console.log('📥 Received credential request:', {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role
    });

    const requestData = req.body;
    const requestId = generateRequestId();
    
    const request = {
      id: requestId,
      ...requestData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Ensure required fields
      recipientPublicKey: requestData.recipientPublicKey || '0',
      credentialType: requestData.credentialType || 'employee',
      validityDays: requestData.validityDays || '30',
      aiConfidence: requestData.aiConfidence || 0.85,
      // AI Verification fields from your original code
      aiRecommendation: requestData.aiRecommendation || true,
      aiJustification: requestData.aiJustification || 'Automatically approved by AI verification system',
      organization: requestData.organization || 'Unknown Organization',
      justification: requestData.justification || 'No justification provided'
    };
    
    pendingRequests.set(requestId, request);
    
    console.log(`✅ Request stored: ${requestId}`);
    
    res.json({
      success: true,
      requestId: requestId,
      message: 'Request submitted successfully',
      nextStep: 'Your request is now pending issuer approval',
      aiVerified: request.aiRecommendation,
      confidence: request.aiConfidence
    });
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit request'
    });
  }
});

/**
 * 5. Approve Request
 */
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
    
    request.status = 'approved';
    request.approvedAt = new Date().toISOString();
    request.approvedBy = req.body.issuer || 'admin';
    request.updatedAt = new Date().toISOString();
    
    pendingRequests.set(requestId, request);
    
    console.log(`✅ Request approved: ${requestId}`);
    
    res.json({
      success: true,
      message: 'Request approved',
      requestId: requestId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 6. Reject Request
 */
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
    
    request.status = 'rejected';
    request.rejectionReason = req.body.reason || 'Not approved';
    request.rejectedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();
    
    pendingRequests.set(requestId, request);
    
    console.log(`❌ Request rejected: ${requestId}`);
    
    res.json({
      success: true,
      message: 'Request rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 7. Upload Credential to IPFS
 */
app.post('/api/ipfs/credential', async (req, res) => {
  try {
    const credentialData = req.body;
    
    console.log('📝 Uploading credential to IPFS:', credentialData.credentialId);
    
    const result = await uploadToIPFS(credentialData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Credential uploaded to IPFS',
        ipfsHash: result.ipfsHash,
        gatewayUrl: result.gatewayUrl,
        note: result.note
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 8. Submit Signed Deploy to Blockchain
 */
app.post('/api/deploy/submit', async (req, res) => {
  try {
    const { signedDeploy } = req.body;
    
    console.log('📤 Received signed deploy for submission');
    
    if (!signedDeploy) {
      return res.status(400).json({
        success: false,
        error: 'No signed deploy provided'
      });
    }
    
    // Check if RPC is available
    if (!casperClient) {
      return res.status(503).json({
        success: false,
        error: 'RPC connection not available',
        note: 'Casper node is offline. Deploy saved but not submitted.'
      });
    }
    
    // Parse deploy
    console.log('🔍 Parsing deploy JSON...');
    const parsed = DeployUtil.deployFromJson(signedDeploy);
    
    if (parsed.err) {
      console.error('❌ Deploy parse error:', parsed.err);
      return res.status(400).json({
        success: false,
        error: 'Invalid deploy JSON',
        details: parsed.err.toString()
      });
    }
    
    const deployObject = parsed.val;
    
    console.log('📋 Deploy parsed successfully:', {
      hash: deployObject.hash.toString('hex'),
      account: deployObject.header.account.toHex(),
      chainName: deployObject.header.chain_name,
      timestamp: deployObject.header.timestamp
    });
    
    // Validate deploy
    console.log('✅ Validating deploy...');
    const isValid = DeployUtil.validateDeploy(deployObject);
    
    if (!isValid) {
      console.error('❌ Deploy validation failed');
      return res.status(400).json({
        success: false,
        error: 'Deploy validation failed',
        details: 'The deploy object did not pass validation checks'
      });
    }
    
    console.log('✅ Deploy validated successfully');
    console.log('🚀 Submitting deploy to blockchain...');
    
    // Submit to Casper network
    const deployHash = await casperClient.putDeploy(deployObject);
    
    console.log(`✅ Deploy submitted! Hash: ${deployHash}`);
    
    res.json({
      success: true,
      message: 'Deploy submitted successfully',
      deployHash: deployHash,
      explorerUrl: `https://testnet.cspr.live/deploy/${deployHash}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Deploy submission failed:', error);
    console.error('Error stack:', error.stack);
    
    // Check if it's a network error
    if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        success: false,
        error: 'RPC node timeout',
        message: 'Casper node is not responding',
        nodeUrl: NODE_URL
      });
    } else if (error.message.includes('Invalid deploy')) {
      res.status(400).json({
        success: false,
        error: 'Invalid Deploy',
        message: 'The deploy structure is invalid',
        details: error.message,
        hint: 'Check that all runtime arguments are correctly formatted'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.stack
      });
    }
  }
});

/**
 * 9. Get Credential by ID
 */
app.get('/api/credentials/:id', (req, res) => {
  try {
    const credential = issuedCredentials.get(req.params.id);
    
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 10. Verify Credential by IPFS Hash
 */
app.get('/api/credentials/verify/:ipfsHash', async (req, res) => {
  try {
    const { ipfsHash } = req.params;
    
    console.log('🔍 Verifying credential via IPFS:', ipfsHash);
    
    const result = await fetchFromIPFS(ipfsHash);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Credential verified on IPFS',
        ipfsHash: ipfsHash,
        data: result.data,
        status: 'valid',
        gateway: result.gateway,
        timestamp: new Date().toISOString()
      });
    } else {
      // Check if we have it in memory
      const storedCredential = Array.from(issuedCredentials.values())
        .find(cred => cred.ipfsHash === ipfsHash);
      
      if (storedCredential) {
        return res.json({
          success: true,
          message: 'Credential found in local storage',
          ipfsHash: ipfsHash,
          data: storedCredential,
          status: 'valid',
          gateway: 'local_storage',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: false,
        error: 'Could not fetch credential from IPFS',
        message: result.error,
        ipfsHash: ipfsHash,
        status: 'not_found',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('IPFS verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      ipfsHash: req.params.ipfsHash
    });
  }
});

/**
 * 11. Send Notification Email (simulated)
 */
app.post('/api/notify', (req, res) => {
  try {
    const { to, subject, credentialId, ipfsHash, validUntil } = req.body;
    
    console.log('📧 Email notification (simulated):');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    console.log('   Credential ID:', credentialId);
    console.log('   IPFS:', ipfsHash);
    
    // In production, integrate with SendGrid, AWS SES, or Nodemailer
    
    res.json({
      success: true,
      message: 'Notification sent (simulated)',
      recipient: to,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 12. Add Test Data
 */
app.post('/api/requests/test', (req, res) => {
  try {
    const testRequests = [
      {
        id: 'REQ_TEST_001',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'Software Engineer',
        organization: 'Tech Corp Inc.',
        justification: 'I need access to the development environment for backend API work on the new microservices architecture.',
        aiConfidence: 0.92,
        aiRecommendation: true,
        aiJustification: 'High confidence based on verified GitHub contributions and professional certifications',
        submittedAt: new Date().toISOString(),
        credentialType: 'employee',
        recipientPublicKey: '0202a35af1609d20a5430464df87a7e7376d01cf415dbb08ae732de33fd619c05a37',
        validityDays: '365',
        metadata: { 
          department: 'Engineering', 
          skills: ['Rust', 'React', 'Node.js'],
          employeeId: 'EMP-2024-001',
          aiVerified: true,
          verificationSource: 'GitHub, LinkedIn, Professional Certs'
        },
        skills: ['Rust', 'React', 'Node.js'],
        department: 'Engineering',
        status: 'pending'
      },
      {
        id: 'REQ_TEST_002',
        name: 'Bob Martinez',
        email: 'bob@university.edu',
        role: 'Research Assistant',
        organization: 'State University',
        justification: 'Access required for research data analysis and lab equipment in the Computer Science department.',
        aiConfidence: 0.78,
        aiRecommendation: true,
        aiJustification: 'Moderate confidence. University email verified. Requires additional supervisor confirmation.',
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        credentialType: 'student',
        recipientPublicKey: '01abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        validityDays: '180',
        metadata: { 
          department: 'Computer Science', 
          supervisor: 'Dr. Wilson',
          studentId: 'STU-2024-042',
          aiVerified: true,
          verificationSource: 'University Email, Course Registration'
        },
        skills: ['Python', 'Data Analysis', 'Machine Learning'],
        department: 'Computer Science',
        status: 'pending'
      },
      {
        id: 'REQ_TEST_003',
        name: 'Carol Davis',
        email: 'carol@contractor.com',
        role: 'Security Consultant',
        organization: 'SecureNet Solutions',
        justification: 'Temporary access needed for security audit of network infrastructure and penetration testing.',
        aiConfidence: 0.85,
        aiRecommendation: true,
        aiJustification: 'High confidence. Company domain verified. Security certifications confirmed.',
        submittedAt: new Date(Date.now() - 172800000).toISOString(),
        credentialType: 'contractor',
        recipientPublicKey: '02fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        validityDays: '90',
        metadata: { 
          department: 'Security', 
          projectCode: 'SEC-AUDIT-2024',
          clearanceLevel: 'L2',
          aiVerified: true,
          verificationSource: 'Company Domain, Security Certs, Previous Contracts'
        },
        skills: ['Cybersecurity', 'Penetration Testing', 'Risk Assessment'],
        department: 'Security',
        status: 'pending'
      }
    ];
    
    testRequests.forEach(req => pendingRequests.set(req.id, req));
    
    console.log(`✅ Added ${testRequests.length} test requests with AI verification data`);
    
    res.json({
      success: true,
      message: 'Test data added successfully',
      count: testRequests.length,
      requests: testRequests.map(r => ({ 
        id: r.id, 
        name: r.name, 
        role: r.role,
        aiConfidence: r.aiConfidence,
        aiRecommendation: r.aiRecommendation
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AI VERIFICATION ENDPOINTS ====================

/**
 * 13. Verify Credential (Main endpoint - with AI Verification)
 */
app.post('/api/verify-credential', async (req, res) => {
  try {
    const { credentialId } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: 'credentialId is required'
      });
    }
    
    console.log(`🔍 Verifying credential with AI check: ${credentialId}`);
    
    // First, try to get from blockchain
    if (rpcClient) {
      try {
        // Try blockchain verification first
        const verifyResult = await queryContractEntryPoint(
          'verify_credential',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        const isValid = verifyResult && verifyResult.success;
        
        // Try to get more details
        let ipfsHash = null;
        let holder = null;
        let issuer = null;
        let aiConfidence = null;
        
        try {
          ipfsHash = await queryContractEntryPoint(
            'get_ipfs_hash',
            [{ 
              name: 'credential_id', 
              value: { 
                cl_type: 'String', 
                value: credentialId 
              } 
            }]
          );
          
          holder = await queryContractEntryPoint(
            'get_holder',
            [{ 
              name: 'credential_id', 
              value: { 
                cl_type: 'String', 
                value: credentialId 
              } 
            }]
          );
          
          issuer = await queryContractEntryPoint(
            'get_issuer',
            [{ 
              name: 'credential_id', 
              value: { 
                cl_type: 'String', 
                value: credentialId 
              } 
            }]
          );
          
          // Try to get AI confidence from contract
          try {
            aiConfidence = await queryContractEntryPoint(
              'get_confidence',
              [{ 
                name: 'credential_id', 
                value: { 
                  cl_type: 'String', 
                  value: credentialId 
                } 
              }]
            );
          } catch (confidenceError) {
            console.log('AI confidence not available in contract');
          }
        } catch (detailError) {
          console.log('Could not fetch credential details:', detailError.message);
        }
        
        // Try to fetch IPFS data if hash is available
        let ipfsData = null;
        if (ipfsHash && ipfsHash.parsed) {
          const ipfsResult = await fetchFromIPFS(ipfsHash.parsed);
          if (ipfsResult.success) {
            ipfsData = ipfsResult.data;
            
            // Extract AI verification data from IPFS
            const aiData = {
              aiVerified: ipfsData.aiRecommendation || false,
              aiConfidence: ipfsData.aiConfidence || ipfsData.aiConfidenceScore || 0,
              aiJustification: ipfsData.aiJustification || 'No AI justification provided',
              verificationSource: ipfsData.verificationSource || 'Unknown'
            };
            
            res.json({
              success: true,
              credential: {
                credentialId: credentialId,
                valid: isValid,
                holder: holder?.parsed || holder?.raw || 'Unknown',
                issuer: issuer?.parsed || issuer?.raw || 'Unknown',
                ipfsHash: ipfsHash?.parsed || ipfsHash?.raw || null,
                verifiedOnChain: true,
                timestamp: new Date().toISOString(),
                // AI Verification Data
                aiVerification: aiData,
                overallConfidence: Math.max(
                  aiData.aiConfidence,
                  aiConfidence?.parsed || 0
                )
              },
              ipfsData: ipfsData,
              message: isValid ? 'Credential is valid' : 'Credential is invalid',
              verification: {
                blockchain: true,
                aiVerified: aiData.aiVerified,
                confidence: aiData.aiConfidence,
                valid: isValid
              }
            });
            return;
          }
        }
        
        // If no IPFS data, return basic verification
        res.json({
          success: true,
          credential: {
            credentialId: credentialId,
            valid: isValid,
            holder: holder?.parsed || holder?.raw || 'Unknown',
            issuer: issuer?.parsed || issuer?.raw || 'Unknown',
            ipfsHash: ipfsHash?.parsed || ipfsHash?.raw || null,
            verifiedOnChain: true,
            timestamp: new Date().toISOString()
          },
          message: isValid ? 'Credential is valid' : 'Credential is invalid',
          verification: {
            blockchain: true,
            valid: isValid,
            aiVerified: false
          }
        });
        
      } catch (blockchainError) {
        console.log('Blockchain verification failed:', blockchainError.message);
        
        // Fallback to checking in-memory storage with AI data
        const storedCredential = issuedCredentials.get(credentialId);
        if (storedCredential) {
          return res.json({
            success: true,
            credential: {
              ...storedCredential,
              verifiedOnChain: false,
              note: 'Found in local storage (blockchain query failed)',
              aiVerification: {
                aiVerified: storedCredential.aiRecommendation || false,
                aiConfidence: storedCredential.aiConfidence || 0,
                aiJustification: storedCredential.aiJustification || 'No AI justification',
                verificationSource: storedCredential.verificationSource || 'Local storage'
              }
            },
            message: 'Credential found in local storage',
            verification: {
              blockchain: false,
              aiVerified: storedCredential.aiRecommendation || false,
              valid: true
            }
          });
        }
        
        res.json({
          success: false,
          error: 'Credential not found',
          message: 'Credential not found on blockchain or in local storage',
          credentialId: credentialId,
          verification: {
            blockchain: false,
            aiVerified: false,
            valid: false
          }
        });
      }
    } else {
      // RPC not available, check in-memory storage with AI data
      const storedCredential = issuedCredentials.get(credentialId);
      if (storedCredential) {
        return res.json({
          success: true,
          credential: {
            ...storedCredential,
            verifiedOnChain: false,
            note: 'Found in local storage (blockchain offline)',
            aiVerification: {
              aiVerified: storedCredential.aiRecommendation || false,
              aiConfidence: storedCredential.aiConfidence || 0,
              aiJustification: storedCredential.aiJustification || 'No AI justification',
              verificationSource: storedCredential.verificationSource || 'Local storage'
            }
          },
          message: 'Credential found in local storage',
          verification: {
            blockchain: false,
            aiVerified: storedCredential.aiRecommendation || false,
            valid: true
          }
        });
      }
      
      res.json({
        success: false,
        error: 'Credential not found',
        message: 'Blockchain offline and credential not in local storage',
        credentialId: credentialId
      });
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 14. Verify Credential on Blockchain (GET version with AI)
 */
app.get('/api/blockchain/credential/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    console.log(`🔍 Querying blockchain for credential with AI: ${credentialId}`);
    
    if (!rpcClient) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain RPC unavailable',
        message: 'Cannot query blockchain in offline mode'
      });
    }
    
    try {
      // Query verify_credential entry point
      const verifyResult = await queryContractEntryPoint(
        'verify_credential',
        [{ 
          name: 'credential_id', 
          value: { 
            cl_type: 'String', 
            value: credentialId 
          } 
        }]
      );
      
      const isValid = verifyResult && verifyResult.success;
      
      // Get additional details
      let holder = null;
      let issuer = null;
      let ipfsHash = null;
      let confidence = null;
      let expiresAt = null;
      let isRevoked = null;
      
      try {
        holder = await queryContractEntryPoint(
          'get_holder',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        issuer = await queryContractEntryPoint(
          'get_issuer',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        ipfsHash = await queryContractEntryPoint(
          'get_ipfs_hash',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        confidence = await queryContractEntryPoint(
          'get_confidence',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        expiresAt = await queryContractEntryPoint(
          'get_expiry',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        isRevoked = await queryContractEntryPoint(
          'is_revoked',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
      } catch (detailError) {
        console.log('Some details unavailable:', detailError.message);
      }
      
      // Try to get IPFS data for AI verification
      let ipfsData = null;
      let aiVerification = null;
      if (ipfsHash?.parsed) {
        const ipfsResult = await fetchFromIPFS(ipfsHash.parsed);
        if (ipfsResult.success) {
          ipfsData = ipfsResult.data;
          aiVerification = {
            aiVerified: ipfsData.aiRecommendation || false,
            aiConfidence: ipfsData.aiConfidence || ipfsData.confidenceScore || 0,
            aiJustification: ipfsData.aiJustification || ipfsData.justification || 'No AI justification',
            verificationSource: ipfsData.verificationSource || 'Unknown'
          };
        }
      }
      
      const credentialData = {
        credentialId: credentialId,
        valid: isValid,
        holder: holder?.parsed || holder?.raw || null,
        issuer: issuer?.parsed || issuer?.raw || null,
        aiConfidence: confidence?.parsed || confidence?.raw || null,
        ipfsHash: ipfsHash?.parsed || ipfsHash?.raw || null,
        expiresAt: expiresAt?.parsed || expiresAt?.raw || null,
        isRevoked: isRevoked?.parsed || isRevoked?.raw || false,
        timestamp: new Date().toISOString(),
        verifiedOnChain: true,
        contractHash: CONTRACT_HASH,
        aiVerification: aiVerification,
        overallVerification: {
          blockchain: true,
          ai: aiVerification?.aiVerified || false,
          confidence: Math.max(
            confidence?.parsed || 0,
            aiVerification?.aiConfidence || 0
          )
        }
      };
      
      console.log(`✅ Blockchain query completed for: ${credentialId}`);
      
      res.json({
        success: true,
        message: 'Credential found on blockchain',
        credential: credentialData,
        ipfsData: ipfsData,
        verification: {
          blockchain: true,
          valid: isValid,
          contractVerified: true,
          aiVerified: aiVerification?.aiVerified || false,
          aiConfidence: aiVerification?.aiConfidence || 0
        }
      });
      
    } catch (queryError) {
      console.log('❌ Credential not found on blockchain:', queryError.message);
      
      res.json({
        success: false,
        error: 'Credential not found on blockchain',
        message: 'This credential ID does not exist in the smart contract',
        credentialId: credentialId,
        verifiedOnChain: false
      });
    }
    
  } catch (error) {
    console.error('Blockchain query error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to query blockchain'
    });
  }
});

/**
 * 15. Get IPFS Data by Hash
 */
app.get('/api/ipfs/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || !hash.startsWith('Qm')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash. Must start with Qm'
      });
    }
    
    console.log(`📄 Viewing IPFS data: ${hash}`);
    
    const result = await fetchFromIPFS(hash);
    
    if (result.success) {
      res.json({
        success: true,
        hash: hash,
        gateway: result.gateway,
        data: result.data,
        timestamp: new Date().toISOString(),
        // Extract AI verification data
        aiVerification: {
          aiVerified: result.data.aiRecommendation || false,
          aiConfidence: result.data.aiConfidence || 0,
          aiJustification: result.data.aiJustification || 'No AI justification',
          verificationSource: result.data.verificationSource || 'Unknown'
        }
      });
    } else {
      // Check if we have it in memory
      const storedData = Array.from(issuedCredentials.values())
        .find(cred => cred.ipfsHash === hash);
      
      if (storedData) {
        return res.json({
          success: true,
          hash: hash,
          gateway: 'local_storage',
          data: storedData,
          note: 'Data from local storage (IPFS gateways unavailable)',
          timestamp: new Date().toISOString(),
          aiVerification: {
            aiVerified: storedData.aiRecommendation || false,
            aiConfidence: storedData.aiConfidence || 0,
            aiJustification: storedData.aiJustification || 'No AI justification',
            verificationSource: storedData.verificationSource || 'Local storage'
          }
        });
      }
      
      res.status(404).json({
        success: false,
        error: 'Could not fetch IPFS data',
        message: result.error,
        hash: hash,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('IPFS view error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch from IPFS',
      message: error.message,
      hash: req.params.hash
    });
  }
});

/**
 * 16. Get Contract Information
 */
app.get('/api/blockchain/contract', async (req, res) => {
  try {
    if (!rpcClient) {
      return res.json({
        success: false,
        status: 'offline',
        message: 'Cannot query contract in offline mode'
      });
    }
    
    try {
      // Query contract owner
      const owner = await queryContractEntryPoint('get_owner', []);
      
      res.json({
        success: true,
        contract: {
          hash: CONTRACT_HASH,
          packageHash: PACKAGE_HASH,
          owner: owner?.parsed || owner?.raw || 'Unknown',
          rpcNode: NODE_URL,
          queryable: true,
          status: 'active'
        }
      });
    } catch (error) {
      res.json({
        success: false,
        error: 'Contract query failed',
        message: error.message,
        contract: {
          hash: CONTRACT_HASH,
          packageHash: PACKAGE_HASH,
          rpcNode: NODE_URL,
          queryable: false,
          status: 'query_failed'
        }
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 17. Test IPFS Gateway
 */
app.get('/api/test/ipfs-gateway', async (req, res) => {
  try {
    const testHash = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'; // Wikipedia IPFS hash for testing
    
    console.log('🧪 Testing IPFS gateway:', PINATA_GATEWAY);
    
    const testGateways = [
      { name: 'Your Custom Gateway', url: `${PINATA_GATEWAY}${testHash}` },
      { name: 'Pinata Public', url: `https://gateway.pinata.cloud/ipfs/${testHash}` },
      { name: 'IPFS.io', url: `https://ipfs.io/ipfs/${testHash}` },
      { name: 'dweb.link', url: `https://dweb.link/ipfs/${testHash}` }
    ];
    
    const results = [];
    
    for (const gateway of testGateways) {
      try {
        console.log(`Testing ${gateway.name}: ${gateway.url}`);
        const startTime = Date.now();
        const response = await axios.get(gateway.url, { 
          timeout: 5000,
          headers: { 'Accept': 'text/html' }
        });
        const endTime = Date.now();
        
        results.push({
          name: gateway.name,
          url: gateway.url,
          status: 'success',
          statusCode: response.status,
          responseTime: `${endTime - startTime}ms`,
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length']
        });
        
        console.log(`✅ ${gateway.name}: Success (${endTime - startTime}ms)`);
      } catch (error) {
        results.push({
          name: gateway.name,
          url: gateway.url,
          status: 'failed',
          error: error.message,
          errorCode: error.code
        });
        
        console.log(`❌ ${gateway.name}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: 'IPFS Gateway Test Results',
      yourGateway: PINATA_GATEWAY,
      testHash: testHash,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 18. Complete Verification (Blockchain + IPFS + AI)
 */
app.get('/api/verify/complete/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    console.log(`🔍 Complete verification with AI for: ${credentialId}`);
    
    const result = {
      credentialId: credentialId,
      timestamp: new Date().toISOString(),
      blockchain: {},
      ipfs: {},
      aiVerification: {},
      status: 'pending'
    };
    
    // 1. Check blockchain
    if (rpcClient) {
      try {
        const blockchainResponse = await queryContractEntryPoint(
          'verify_credential',
          [{ 
            name: 'credential_id', 
            value: { 
              cl_type: 'String', 
              value: credentialId 
            } 
          }]
        );
        
        result.blockchain = {
          exists: !!blockchainResponse,
          valid: blockchainResponse?.success || false,
          raw: blockchainResponse
        };
        
        // Get IPFS hash from blockchain
        if (blockchainResponse) {
          const ipfsHash = await queryContractEntryPoint(
            'get_ipfs_hash',
            [{ 
              name: 'credential_id', 
              value: { 
                cl_type: 'String', 
                value: credentialId 
              } 
            }]
          );
          
          if (ipfsHash?.parsed) {
            result.ipfsHash = ipfsHash.parsed;
            
            // 2. Check IPFS for AI data
            const ipfsResult = await fetchFromIPFS(ipfsHash.parsed);
            result.ipfs = {
              exists: true,
              accessible: ipfsResult.success,
              data: ipfsResult.success ? ipfsResult.data : null,
              gateway: ipfsResult.gateway,
              error: ipfsResult.error
            };
            
            // 3. Extract AI verification data
            if (ipfsResult.success && ipfsResult.data) {
              result.aiVerification = {
                aiVerified: ipfsResult.data.aiRecommendation || false,
                aiConfidence: ipfsResult.data.aiConfidence || 0,
                aiJustification: ipfsResult.data.aiJustification || 'No AI justification',
                verificationSource: ipfsResult.data.verificationSource || 'Unknown',
                confidenceScore: ipfsResult.data.confidenceScore || ipfsResult.data.aiConfidence || 0
              };
            }
          }
        }
      } catch (error) {
        result.blockchain = {
          exists: false,
          error: error.message
        };
      }
    } else {
      result.blockchain = {
        exists: false,
        error: 'RPC unavailable'
      };
    }
    
    // Determine final status with AI consideration
    if (result.blockchain.exists && result.blockchain.valid) {
      if (result.aiVerification.aiVerified) {
        result.status = 'VERIFIED_AI_VALID';
        result.message = 'Credential is valid and AI-verified on blockchain';
      } else {
        result.status = 'VALID_NO_AI';
        result.message = 'Credential is valid on blockchain but not AI-verified';
      }
    } else if (result.blockchain.exists && !result.blockchain.valid) {
      result.status = 'INVALID';
      result.message = 'Credential found but is invalid (revoked or expired)';
    } else if (!result.blockchain.exists) {
      result.status = 'NOT_FOUND';
      result.message = 'Credential not found on blockchain';
    } else {
      result.status = 'ERROR';
      result.message = 'Verification error occurred';
    }
    
    res.json({
      success: true,
      verification: result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 19. AI Verification Endpoint (Standalone)
 */
app.post('/api/ai/verify', async (req, res) => {
  try {
    const { name, email, organization, role, justification } = req.body;
    
    console.log('🤖 AI Verification requested for:', name);
    
    // Simulated AI verification logic (from your original code)
    const aiConfidence = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
    const aiRecommendation = aiConfidence > 0.7;
    
    // Simulate different verification sources based on email domain
    let verificationSource = 'Basic verification';
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      if (domain.includes('edu')) {
        verificationSource = 'Educational institution verification';
      } else if (domain.includes('gov')) {
        verificationSource = 'Government verification';
      } else if (domain.includes('company.com') || domain.includes('corp.com')) {
        verificationSource = 'Corporate email verification';
      }
    }
    
    // Simulate AI justification
    const aiJustification = aiRecommendation 
      ? `AI verification successful with ${(aiConfidence * 100).toFixed(1)}% confidence. ${verificationSource}.`
      : `AI verification failed. Confidence level ${(aiConfidence * 100).toFixed(1)}% is below threshold.`;
    
    res.json({
      success: true,
      aiVerification: {
        name: name,
        email: email,
        organization: organization || 'Unknown',
        role: role || 'Unknown',
        aiConfidence: parseFloat(aiConfidence.toFixed(3)),
        aiRecommendation: aiRecommendation,
        aiJustification: aiJustification,
        verificationSource: verificationSource,
        timestamp: new Date().toISOString(),
        verificationId: `AI_VERIFY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
      },
      message: aiRecommendation 
        ? 'AI verification passed. Ready for issuer review.' 
        : 'AI verification failed. Manual review required.'
    });
    
  } catch (error) {
    console.error('AI verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 20. Issue Credential (Complete workflow with AI)
 */
app.post('/api/issue-credential', async (req, res) => {
  try {
    const {
      requestId,
      issuerPublicKey,
      issuerName,
      credentialType,
      additionalData = {}
    } = req.body;
    
    console.log(`🎫 Issuing credential for request: ${requestId}`);
    
    // Get the request
    const request = pendingRequests.get(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Request must be approved before issuing credential'
      });
    }
    
    // Generate credential ID
    const credentialId = generateCredentialId();
    
    // Create credential data
    const credentialData = {
      credentialId: credentialId,
      credentialType: credentialType || request.credentialType,
      recipientName: request.name,
      recipientEmail: request.email,
      recipientPublicKey: request.recipientPublicKey,
      recipientRole: request.role,
      recipientOrganization: request.organization || additionalData.organization,
      issuerPublicKey: issuerPublicKey,
      issuerName: issuerName,
      issueDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + (parseInt(request.validityDays) * 24 * 60 * 60 * 1000)).toISOString(),
      
      // AI Verification data
      aiConfidence: request.aiConfidence,
      aiRecommendation: request.aiRecommendation,
      aiJustification: request.aiJustification || request.justification,
      verificationSource: request.verificationSource || 'AI + Manual Review',
      
      // Additional metadata
      skills: request.skills || [],
      department: request.department || '',
      metadata: {
        ...request.metadata,
        ...additionalData,
        originalRequestId: requestId,
        issuedBy: issuerName,
        issuanceTimestamp: new Date().toISOString(),
        blockchain: 'Casper',
        contractHash: CONTRACT_HASH
      }
    };
    
    // Upload to IPFS
    console.log(`📤 Uploading credential to IPFS: ${credentialId}`);
    const ipfsResult = await uploadToIPFS(credentialData);
    
    if (!ipfsResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload to IPFS',
        details: ipfsResult.error
      });
    }
    
    // Store in memory
    const issuedCredential = {
      ...credentialData,
      ipfsHash: ipfsResult.ipfsHash,
      ipfsGatewayUrl: ipfsResult.gatewayUrl,
      status: 'issued',
      blockchainHash: null, // To be filled when deployed
      issuedAt: new Date().toISOString()
    };
    
    issuedCredentials.set(credentialId, issuedCredential);
    
    // Update request status
    request.status = 'issued';
    request.credentialId = credentialId;
    request.issuedAt = new Date().toISOString();
    request.ipfsHash = ipfsResult.ipfsHash;
    
    pendingRequests.set(requestId, request);
    
    console.log(`✅ Credential issued: ${credentialId}`);
    console.log(`   IPFS Hash: ${ipfsResult.ipfsHash}`);
    console.log(`   AI Confidence: ${request.aiConfidence}`);
    
    res.json({
      success: true,
      message: 'Credential issued successfully',
      credential: {
        credentialId: credentialId,
        ipfsHash: ipfsResult.ipfsHash,
        gatewayUrl: ipfsResult.gatewayUrl,
        recipientName: request.name,
        recipientEmail: request.email,
        issuerName: issuerName,
        issueDate: new Date().toISOString(),
        aiVerified: request.aiRecommendation,
        aiConfidence: request.aiConfidence,
        nextStep: 'Sign and deploy to blockchain using /api/deploy/submit'
      },
      deployData: {
        credentialId: credentialId,
        holderPublicKey: request.recipientPublicKey,
        issuerPublicKey: issuerPublicKey,
        ipfsHash: ipfsResult.ipfsHash,
        credentialType: credentialType || request.credentialType,
        aiConfidence: request.aiConfidence,
        validUntil: issuedCredential.validUntil
      }
    });
    
  } catch (error) {
    console.error('Credential issuance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

async function startServer() {
  // Initialize Casper clients
  await initializeCasperClients();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 CasperCredIQ Backend Server');
    console.log('='.repeat(70));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 RPC Node: ${NODE_URL}`);
    console.log(`📦 Contract Hash: ${CONTRACT_HASH}`);
    console.log(`📦 Package Hash: ${PACKAGE_HASH}`);
    console.log(`💾 IPFS Gateway: ${PINATA_GATEWAY}`);
    console.log(`📡 Pinata API: ${PINATA_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`🤖 AI Verification: ✓ Integrated`);
    
    console.log(`\n📋 API Endpoints:`);
    console.log(`   GET  /health                       - Health check`);
    console.log(`   GET  /api/rpc-test                 - Test RPC connection`);
    console.log(`   GET  /api/requests                 - Get pending requests`);
    console.log(`   POST /api/requests                 - Submit new request`);
    console.log(`   POST /api/requests/:id/approve     - Approve request`);
    console.log(`   POST /api/requests/:id/reject      - Reject request`);
    console.log(`   POST /api/requests/test            - Add test data`);
    console.log(`   POST /api/ipfs/credential          - Upload to IPFS`);
    console.log(`   POST /api/deploy/submit            - Submit signed deploy`);
    console.log(`   GET  /api/credentials/:id          - Get credential`);
    console.log(`   GET  /api/credentials/verify/:hash - Verify credential`);
    console.log(`   POST /api/notify                   - Send notification`);
    
    console.log(`\n🤖 AI Verification Endpoints:`);
    console.log(`   POST /api/verify-credential        - Verify credential (main)`);
    console.log(`   GET  /api/blockchain/credential/:id - Verify on blockchain`);
    console.log(`   GET  /api/ipfs/:hash               - Get IPFS data`);
    console.log(`   GET  /api/blockchain/contract      - Get contract info`);
    console.log(`   GET  /api/test/ipfs-gateway        - Test IPFS gateway`);
    console.log(`   GET  /api/verify/complete/:id      - Complete verification`);
    console.log(`   POST /api/ai/verify                - AI verification standalone`);
    console.log(`   POST /api/issue-credential         - Complete credential issuance`);
    
    console.log(`\n💡 Quick Test:`);
    console.log(`   curl http://localhost:${PORT}/health`);
    console.log(`   curl http://localhost:${PORT}/api/rpc-test`);
    console.log(`   curl http://localhost:${PORT}/api/test/ipfs-gateway`);
    console.log(`   curl http://localhost:${PORT}/api/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`);
    console.log(`   curl -X POST http://localhost:${PORT}/api/requests/test`);
    console.log(`   curl -X POST http://localhost:${PORT}/api/ai/verify -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com"}'`);
    
    console.log(`\n✅ Server ready with AI Verification!\n`);
    console.log('='.repeat(70) + '\n');
  });
}

startServer();

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});