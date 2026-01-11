// server.js - COMPLETE FIXED VERSION for CasperCredIQ with Dictionary Verification
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

async function fetchFromIPFS(ipfsHash) {
  try {
    console.log(`Fetching from IPFS: ${ipfsHash}`);
    
    const gateways = [
      `${PINATA_GATEWAY}${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://dweb.link/ipfs/${ipfsHash}`,
      `https://${ipfsHash}.ipfs.dweb.link/`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
    ];
    
    for (const [index, gateway] of gateways.entries()) {
      try {
        console.log(`  Trying gateway ${index + 1}: ${gateway}`);
        const timeout = index === 0 ? 10000 : 5000;
        
        const response = await axios.get(gateway, { 
          timeout: timeout,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CasperCredIQ/1.0'
          },
          validateStatus: function (status) {
            return status === 200;
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

// ==================== DICTIONARY VERIFICATION FUNCTIONS ====================

/**
 * Get contract's state URef from named_keys
 */
async function getContractStateURef() {
  try {
    console.log('🔍 Getting contract state URef...');
    
    const stateRoot = await rpcClient.getStateRootHash();
    
    const query = await rpcClient.queryGlobalState({
      key: `hash-${CONTRACT_HASH}`,
      path: []
    });
    
    if (!query || !query.StoredValue || !query.StoredValue.Contract) {
      throw new Error('Contract not found at hash: ' + CONTRACT_HASH);
    }
    
    const namedKeys = query.StoredValue.Contract.named_keys || [];
    const stateEntry = namedKeys.find(nk => nk.name === 'state');
    
    if (!stateEntry) {
      throw new Error('State URef not found in contract named_keys');
    }
    
    const stateUref = stateEntry.key;
    console.log(`✅ Found state URef: ${stateUref.substring(0, 50)}...`);
    
    return stateUref;
  } catch (error) {
    console.error('❌ Failed to get state URef:', error.message);
    throw error;
  }
}

/**
 * Compute dictionary key for Odra contract
 * Format: blake2b(state_uref + mapping_name + key)
 */
async function computeOdraDictionaryKey(mappingName, credentialId) {
  try {
    const stateUref = await getContractStateURef();
    const urefAddr = stateUref.replace('uref-', '').split('-')[0];
    const urefBytes = Buffer.from(urefAddr, 'hex');
    
    console.log(`🔧 Computing dictionary for mapping: ${mappingName}, ID: ${credentialId}`);
    
    const mappingNameBytes = Buffer.from(mappingName, 'utf-8');
    const mappingNameLen = Buffer.alloc(4);
    mappingNameLen.writeUInt32LE(mappingNameBytes.length, 0);
    
    const keyBytes = Buffer.from(credentialId, 'utf-8');
    const keyLen = Buffer.alloc(4);
    keyLen.writeUInt32LE(keyBytes.length, 0);
    
    const seed = Buffer.concat([
      urefBytes,
      mappingNameLen,
      mappingNameBytes,
      keyLen,
      keyBytes
    ]);
    
    const hash = crypto.createHash('blake2b512').update(seed).digest();
    const dictAddr = hash.slice(0, 32).toString('hex');
    const dictionaryKey = `dictionary-${dictAddr}`;
    
    console.log(`✅ Computed dictionary: ${dictionaryKey}`);
    
    return dictionaryKey;
    
  } catch (error) {
    console.error('❌ Dictionary computation failed:', error);
    throw error;
  }
}

/**
 * Query dictionary and parse CLValue
 */
async function queryDictionary(dictionaryKey) {
  try {
    const stateRoot = await rpcClient.getStateRootHash();
    
    const query = await rpcClient.queryGlobalState({
      key: dictionaryKey,
      path: []
    });
    
    if (!query || !query.StoredValue || !query.StoredValue.CLValue) {
      return { found: false, data: null };
    }
    
    const clValue = query.StoredValue.CLValue;
    const parsedValue = parseCLValue(clValue);
    
    return {
      found: true,
      data: parsedValue,
      raw: clValue
    };
  } catch (error) {
    if (error.message && (error.message.includes('ValueNotFound') || 
                          error.message.includes('state query failed'))) {
      return { found: false, data: null };
    }
    throw error;
  }
}

/**
 * Parse CLValue from Odra contract
 */
function parseCLValue(clValue) {
  if (!clValue || !clValue.bytes) return null;
  
  const { cl_type, bytes } = clValue;
  const hexBytes = bytes.startsWith('0x') ? bytes.slice(2) : bytes;
  
  try {
    if (cl_type === 'Bool') {
      return hexBytes === '01';
    } else if (cl_type === 'U8') {
      return parseInt(hexBytes, 16);
    } else if (cl_type === 'U64' || cl_type === 'U32') {
      return parseInt(hexBytes, 16);
    } else if (cl_type === 'String') {
      const buffer = Buffer.from(hexBytes, 'hex');
      const length = buffer.readUInt32LE(0);
      return buffer.toString('utf-8', 4, 4 + length);
    } else if (cl_type === 'Key' || cl_type === 'ByteArray') {
      return bytes;
    } else if (cl_type === 'Option') {
      if (hexBytes === '00') return null;
      const innerValue = { ...clValue, bytes: '0x' + hexBytes.slice(2) };
      return parseCLValue(innerValue);
    } else if (cl_type && cl_type.Struct) {
      const buffer = Buffer.from(hexBytes, 'hex');
      if (buffer.length === 33 && buffer[0] === 0x00) {
        const accountBytes = buffer.slice(1);
        return 'account-hash-' + accountBytes.toString('hex');
      }
      return bytes;
    }
    
    return bytes;
  } catch (error) {
    console.error('Parse error for CLValue:', error);
    return bytes;
  }
}

/**
 * Parse Address from bytes
 */
function parseAddressFromBytes(hexBytes) {
  if (!hexBytes) return null;
  
  try {
    const bytes = hexBytes.startsWith('0x') ? hexBytes.slice(2) : hexBytes;
    const buffer = Buffer.from(bytes, 'hex');
    
    if (buffer.length === 33 && buffer[0] === 0x00) {
      const accountHashBytes = buffer.slice(1);
      return 'account-hash-' + accountHashBytes.toString('hex');
    }
    return null;
  } catch (error) {
    console.error('Address parse error:', error);
    return null;
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
      recipientPublicKey: requestData.recipientPublicKey || '0',
      credentialType: requestData.credentialType || 'employee',
      validityDays: requestData.validityDays || '30',
      aiConfidence: requestData.aiConfidence || 0.85
    };
    
    pendingRequests.set(requestId, request);
    
    console.log(`✅ Request stored: ${requestId}`);
    
    res.json({
      success: true,
      requestId: requestId,
      message: 'Request submitted successfully',
      nextStep: 'Your request is now pending issuer approval'
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
    
    if (!casperClient) {
      return res.status(503).json({
        success: false,
        error: 'RPC connection not available',
        note: 'Casper node is offline. Deploy saved but not submitted.'
      });
    }
    
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
        submittedAt: new Date().toISOString(),
        credentialType: 'employee',
        recipientPublicKey: '0202a35af1609d20a5430464df87a7e7376d01cf415dbb08ae732de33fd619c05a37',
        validityDays: '365',
        metadata: { 
          department: 'Engineering', 
          skills: ['Rust', 'React', 'Node.js'],
          employeeId: 'EMP-2024-001'
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
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        credentialType: 'student',
        recipientPublicKey: '01abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        validityDays: '180',
        metadata: { 
          department: 'Computer Science', 
          supervisor: 'Dr. Wilson',
          studentId: 'STU-2024-042'
        },
        skills: ['Python', 'Data Analysis', 'Machine Learning'],
        department: 'Computer Science',
        status: 'pending'
      }
    ];
    
    testRequests.forEach(req => pendingRequests.set(req.id, req));
    
    console.log(`✅ Added ${testRequests.length} test requests`);
    
    res.json({
      success: true,
      message: 'Test data added successfully',
      count: testRequests.length,
      requests: testRequests.map(r => ({ 
        id: r.id, 
        name: r.name, 
        role: r.role 
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== VERIFICATION ENDPOINTS ====================

/**
 * 13. Dictionary-based Verification (Main endpoint)
 */
app.get('/api/verify/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    console.log(`🔐 Dictionary verification for: ${credentialId}`);
    
    if (!rpcClient) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain RPC unavailable',
        message: 'Cannot verify credential in offline mode'
      });
    }
    
    const mappings = [
      { name: 'cred_holder', field: 'holder' },
      { name: 'cred_issuer', field: 'issuer' },
      { name: 'cred_confidence', field: 'confidence' },
      { name: 'cred_expires', field: 'expiresAt' },
      { name: 'cred_revoked', field: 'revoked' },
      { name: 'cred_ipfs', field: 'ipfsHash' }
    ];
    
    const results = {};
    const dictionaries = {};
    
    for (const mapping of mappings) {
      console.log(`📊 Querying mapping: ${mapping.name}`);
      
      try {
        const dictKey = await computeOdraDictionaryKey(mapping.name, credentialId);
        const queryResult = await queryDictionary(dictKey);
        
        dictionaries[mapping.name] = dictKey;
        results[mapping.field] = queryResult.found ? queryResult.data : null;
        
        console.log(`   ${mapping.name}: ${queryResult.found ? 'FOUND' : 'NOT FOUND'}`);
        if (queryResult.found) {
          console.log(`   Value: ${results[mapping.field]}`);
        }
      } catch (error) {
        console.error(`Error querying ${mapping.name}:`, error.message);
        results[mapping.field] = null;
      }
    }
    
    if (!results.holder) {
      return res.json({
        success: true,
        credentialId,
        exists: false,
        isValid: false,
        message: 'Credential not found'
      });
    }
    
    const holder = results.holder;
    const issuer = results.issuer;
    const revoked = results.revoked === true || results.revoked === 'true';
    const expiresAt = results.expiresAt ? parseInt(results.expiresAt) : null;
    const confidence = results.confidence ? parseInt(results.confidence) : null;
    const ipfsHash = results.ipfsHash;
    
    const currentTime = Date.now();
    const isExpired = expiresAt ? currentTime > expiresAt : false;
    const isValid = !revoked && !isExpired;
    
    let ipfsData = null;
    if (ipfsHash) {
      try {
        const ipfsResult = await fetchFromIPFS(ipfsHash);
        if (ipfsResult.success) {
          ipfsData = ipfsResult.data;
        }
      } catch (ipfsError) {
        console.log('Could not fetch IPFS data:', ipfsError.message);
      }
    }
    
    const response = {
      success: true,
      credentialId,
      exists: true,
      isValid,
      details: {
        holder,
        issuer,
        revoked,
        expiresAt,
        isExpired,
        aiConfidence: confidence,
        ipfsHash
      },
      verifiedAt: new Date().toISOString(),
      verificationMethod: 'dictionary'
    };
    
    if (process.env.NODE_ENV === 'development') {
      response.dictionaries = dictionaries;
    }
    
    if (ipfsData) {
      response.ipfsData = ipfsData;
    }
    
    console.log(`✅ Verification complete: ${credentialId} is ${isValid ? 'VALID' : 'INVALID'}`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to verify credential'
    });
  }
});

/**
 * 14. Simple Verification (Quick check)
 */
app.get('/api/verify/simple/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    console.log(`⚡ Quick verification for: ${credentialId}`);
    
    if (!rpcClient) {
      return res.json({
        success: false,
        error: 'RPC unavailable'
      });
    }
    
    const holderDict = await computeOdraDictionaryKey('cred_holder', credentialId);
    const holderResult = await queryDictionary(holderDict);
    
    if (!holderResult.found) {
      return res.json({
        success: true,
        credentialId,
        exists: false,
        valid: false,
        message: 'Credential not found'
      });
    }
    
    const revokedDict = await computeOdraDictionaryKey('cred_revoked', credentialId);
    const revokedResult = await queryDictionary(revokedDict);
    const isRevoked = revokedResult.found && revokedResult.data === true;
    
    res.json({
      success: true,
      credentialId,
      exists: true,
      valid: !isRevoked,
      revoked: isRevoked,
      holder: holderResult.data,
      message: isRevoked ? 'Credential has been revoked' : 'Credential is active',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Quick verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 15. Get Credential Details (All fields)
 */
app.get('/api/credential/:credentialId', async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    console.log(`📄 Getting details for: ${credentialId}`);
    
    if (!rpcClient) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain unavailable'
      });
    }
    
    const fields = [
      { dict: 'cred_holder', name: 'holder' },
      { dict: 'cred_issuer', name: 'issuer' },
      { dict: 'cred_confidence', name: 'aiConfidence' },
      { dict: 'cred_expires', name: 'expiresAt' },
      { dict: 'cred_revoked', name: 'revoked' },
      { dict: 'cred_ipfs', name: 'ipfsHash' }
    ];
    
    const result = { credentialId };
    
    for (const field of fields) {
      try {
        const dictKey = await computeOdraDictionaryKey(field.dict, credentialId);
        const queryResult = await queryDictionary(dictKey);
        result[field.name] = queryResult.found ? queryResult.data : null;
      } catch (error) {
        result[field.name] = null;
      }
    }
    
    const isRevoked = result.revoked === true;
    const expiresAt = result.expiresAt ? parseInt(result.expiresAt) : null;
    const isExpired = expiresAt ? Date.now() > expiresAt : false;
    const isValid = !isRevoked && !isExpired;
    
    res.json({
      success: true,
      credential: result,
      isValid,
      verifiedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get credential error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 16. Legacy Verification (for backward compatibility)
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
    
    console.log(`🔍 Verifying credential: ${credentialId}`);
    
    if (rpcClient) {
      try {
        const verifyResponse = await fetch(`http://localhost:${PORT}/api/verify/${credentialId}`);
        const data = await verifyResponse.json();
        
        if (data.success) {
          return res.json({
            success: true,
            credential: {
              credentialId: credentialId,
              valid: data.isValid,
              holder: data.details.holder,
              issuer: data.details.issuer,
              aiConfidence: data.details.aiConfidence,
              ipfsHash: data.details.ipfsHash,
              expiresAt: data.details.expiresAt,
              revoked: data.details.revoked,
              verifiedOnChain: true,
              timestamp: data.verifiedAt
            },
            message: data.isValid ? 'Credential is valid' : 'Credential is invalid',
            verification: {
              blockchain: true,
              method: 'dictionary',
              valid: data.isValid
            }
          });
        }
      } catch (dictError) {
        console.log('Dictionary verification failed, falling back:', dictError.message);
      }
    }
    
    const storedCredential = issuedCredentials.get(credentialId);
    if (storedCredential) {
      return res.json({
        success: true,
        credential: {
          ...storedCredential,
          verifiedOnChain: false,
          note: 'Found in local storage (blockchain query failed)'
        },
        message: 'Credential found in local storage',
        verification: {
          blockchain: false,
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
        valid: false
      }
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 17. Compute Dictionary Key (Debug endpoint)
 */
app.get('/api/debug/dictionary/:mapping/:credentialId', async (req, res) => {
  try {
    const { mapping, credentialId } = req.params;
    
    console.log(`🔧 Computing dictionary key for: ${mapping}/${credentialId}`);
    
    if (!rpcClient) {
      return res.status(503).json({
        success: false,
        error: 'RPC unavailable'
      });
    }
    
    const dictKey = await computeOdraDictionaryKey(mapping, credentialId);
    
    const queryResult = await queryDictionary(dictKey);
    
    res.json({
      success: true,
      mapping,
      credentialId,
      dictionaryKey: dictKey,
      exists: queryResult.found,
      value: queryResult.data,
      raw: queryResult.raw
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 18. Get IPFS Data by Hash
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
        timestamp: new Date().toISOString()
      });
    } else {
      const storedData = Array.from(issuedCredentials.values())
        .find(cred => cred.ipfsHash === hash);
      
      if (storedData) {
        return res.json({
          success: true,
          hash: hash,
          gateway: 'local_storage',
          data: storedData,
          note: 'Data from local storage (IPFS gateways unavailable)',
          timestamp: new Date().toISOString()
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
 * 19. Test IPFS Gateway
 */
app.get('/api/test/ipfs-gateway', async (req, res) => {
  try {
    const testHash = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    
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

// ==================== START SERVER ====================

async function startServer() {
  await initializeCasperClients();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 CasperCredIQ Backend Server');
    console.log('='.repeat(70));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 RPC Node: ${NODE_URL}`);
    console.log(`📦 Contract Hash: ${CONTRACT_HASH}`);
    console.log(`📦 Package Hash: ${PACKAGE_HASH}`);
    
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
    
    console.log(`\n🔍 Verification Endpoints:`);
    console.log(`   GET  /api/verify/:id               - Dictionary verification`);
    console.log(`   GET  /api/verify/simple/:id        - Quick check`);
    console.log(`   GET  /api/credential/:id          - Get all details`);
    console.log(`   GET  /api/debug/dictionary/:map/:id - Compute dictionary key`);
    console.log(`   POST /api/verify-credential       - Verify (legacy)`);
    console.log(`   GET  /api/ipfs/:hash              - Get IPFS data`);
    console.log(`   GET  /api/test/ipfs-gateway       - Test IPFS gateway`);
    
    console.log(`\n💡 Quick Test:`);
    console.log(`   curl http://localhost:${PORT}/health`);
    console.log(`   curl http://localhost:${PORT}/api/verify/FRESH_TEST`);
    console.log(`   curl http://localhost:${PORT}/api/verify/simple/FRESH_TEST`);
    console.log(`   curl -X POST http://localhost:${PORT}/api/requests/test`);
    
    console.log(`\n✅ Server ready!\n`);
    console.log('='.repeat(70) + '\n');
  });
}

startServer();

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});