// server.js - Complete CasperCred Backend API
// Combines credential verification logic with RPC proxy and Odra dictionary computation
// Install dependencies: npm install express cors body-parser casper-js-sdk crypto node-fetch@2

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import casperSdk from 'casper-js-sdk';
import crypto from 'crypto';
import fetch from 'node-fetch';

const {
  CasperClient,
  CasperServiceByJsonRPC,
  DeployUtil,
  CLPublicKey
} = casperSdk;

const app = express();
const PORT = process.env.PORT || 3001;

const CONTRACT_HASH = 'afd7ca51f8ab1d415b7abf2439074924bd486ad12f0babfdf539e891ef6c4a1a';
const NODE_URL = 'http://65.109.83.79:7777/rpc';

/**
 * CORS Configuration
 */
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://fearless-laughter-production.up.railway.app',
    'https://caspercrediq-production.up.railway.app',
    'https://amusing-celebration-production.up.railway.app/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json());

/**
 * Casper clients
 */
const casperClient = new CasperClient(NODE_URL);
const rpcClient = new CasperServiceByJsonRPC(NODE_URL);

console.log('✅ Backend connected to Casper RPC');
console.log('   RPC:', NODE_URL);
console.log('   Contract:', CONTRACT_HASH);

/**
 * RPC Health Check
 */
async function checkConnection() {
  try {
    const status = await rpcClient.getStatus();
    console.log('✅ RPC connection successful');
    console.log('   Chain:', status.chainspec_name);
    console.log('   API Version:', status.api_version);
    console.log('   Peers:', status.peers.length);
  } catch (err) {
    console.error('❌ RPC connection failed:', err.message);
  }
}

checkConnection();

/**
 * Helper: Parse credential from hex bytes
 */
function parseCredential(hexBytes) {
  const bytes = hexBytes.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
  
  let offset = 0;
  
  // Check for outer length prefix (some serializations include this)
  if (bytes.length >= 4) {
    const outerLen = bytes[offset] | 
                    (bytes[offset + 1] << 8) | 
                    (bytes[offset + 2] << 16) | 
                    (bytes[offset + 3] << 24);
    
    // If outer length + 4 bytes matches total length, skip it
    if (outerLen + 4 === bytes.length) {
      console.log('Skipping outer length prefix of', outerLen);
      offset = 4;
    }
  }
  
  // Read role (String: 4 bytes length + data)
  const roleLength = bytes[offset] + (bytes[offset+1] << 8) + 
                     (bytes[offset+2] << 16) + (bytes[offset+3] << 24);
  offset += 4;
  const role = String.fromCharCode(...bytes.slice(offset, offset + roleLength));
  offset += roleLength;
  
  console.log(`Parsed role: "${role}" (length: ${roleLength})`);
  
  // Read issued_at (u64: 8 bytes) - Use BigInt for precision
  const issuedAt = bytes.slice(offset, offset + 8)
    .reduce((acc, byte, i) => acc + BigInt(byte) * (2n ** BigInt(i * 8)), 0n);
  offset += 8;
  
  console.log(`Parsed issuedAt: ${issuedAt.toString()}`);
  
  // Read expires_at (u64: 8 bytes) - Use BigInt for precision
  const expiresAt = bytes.slice(offset, offset + 8)
    .reduce((acc, byte, i) => acc + BigInt(byte) * (2n ** BigInt(i * 8)), 0n);
  offset += 8;
  
  console.log(`Parsed expiresAt: ${expiresAt.toString()}`);
  
  // Read revoked (bool: 1 byte)
  const revokedByte = bytes[offset];
  const revoked = revokedByte === 1;
  offset += 1;
  
  console.log(`Parsed revoked byte: ${revokedByte}, revoked: ${revoked}`);
  
  // Read issuer tag (1 byte) - IMPORTANT: Address type has a tag byte!
  const issuerTag = bytes[offset];
  offset += 1;
  
  console.log(`Issuer tag: ${issuerTag}`);
  
  // Read issuer (Address: 32 bytes after the tag)
  const issuerBytes = bytes.slice(offset, offset + 32);
  const issuer = 'account-hash-' + issuerBytes.map(b => 
    b.toString(16).padStart(2, '0')).join('');
  offset += 32;
  
  console.log(`Parsed issuer: ${issuer.substring(0, 50)}...`);
  console.log(`Total bytes consumed: ${offset} of ${bytes.length}`);
  
  // Convert BigInt to string to preserve precision in JSON
  return { 
    role, 
    issuedAt: issuedAt.toString(), 
    expiresAt: expiresAt.toString(), 
    revoked, 
    issuer 
  };
}

/**
 * Helper: Make RPC call to Casper node
 */
async function casperRPC(method, params) {
  const response = await fetch(NODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }
  
  return data.result;
}

/**
 * RPC PROXY
 */
app.post('/rpc', async (req, res) => {
  const startTime = Date.now();
  
  console.log('📡 RPC Proxy Request:', {
    method: req.body.method,
    id: req.body.id
  });
  
  try {
    const response = await fetch(NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('❌ RPC node HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        method: req.body.method
      });
      
      return res.status(response.status).json({
        jsonrpc: '2.0',
        id: req.body.id,
        error: {
          code: -32000,
          message: `Node HTTP error: ${response.status} ${response.statusText}`
        }
      });
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ RPC Error Response:', {
        method: req.body.method,
        errorCode: data.error.code,
        errorMessage: data.error.message,
        responseTime: `${responseTime}ms`
      });
    } else {
      console.log('✅ RPC Success:', {
        method: req.body.method,
        responseTime: `${responseTime}ms`
      });
    }
    
    res.json(data);
    
  } catch (err) {
    console.error('❌ RPC Proxy Exception:', {
      method: req.body.method,
      error: err.message
    });
    
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: `Proxy error: ${err.message}`
      }
    });
  }
});

/**
 * Submit Deploy
 */
app.post('/submit-deploy', async (req, res) => {
  console.log('📥 Received deploy request');
  
  try {
    const { deploy } = req.body;
    
    if (!deploy) {
      return res.status(400).json({ error: 'No deploy provided' });
    }
    
    const parsed = DeployUtil.deployFromJson(deploy);
    
    if (parsed.err) {
      return res.status(400).json({
        error: 'Invalid deploy JSON',
        details: parsed.err.toString()
      });
    }
    
    const deployObject = parsed.val;
    
    if (!DeployUtil.validateDeploy(deployObject)) {
      return res.status(400).json({
        error: 'Deploy validation failed'
      });
    }
    
    console.log('🚀 Submitting deploy...');
    
    const deployHash = await casperClient.putDeploy(deployObject);
    
    console.log('✅ Deploy submitted:', deployHash);
    
    res.json({
      status: 'success',
      hash: deployHash
    });
    
  } catch (err) {
    console.error('❌ Deploy submission failed:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Deploy failed'
    });
  }
});

/**
 * Compute Odra Dictionary Address - CORRECT IMPLEMENTATION
 * 
 * Based on Odra's nested dictionary structure.
 * The "state" URef points to the mapping's dictionary.
 * Within that dictionary, each account has their own entry.
 * 
 * Dictionary key = blake2b(mapping_name + serialized_account_key)
 */
app.post('/compute-odra-dict', async (req, res) => {
  try {
    const { stateUref, accountHash } = req.body;
    
    console.log('🔍 Computing Odra dictionary address:', {
      stateUref: stateUref?.slice(0, 30) + '...',
      accountHash: accountHash?.slice(0, 16) + '...'
    });
    
    // Extract URef address (32 bytes, no access rights suffix)
    const urefAddr = stateUref.replace('uref-', '').split('-')[0];
    const urefBytes = Buffer.from(urefAddr, 'hex');
    
    if (urefBytes.length !== 32) {
      throw new Error(`Invalid URef length: ${urefBytes.length}, expected 32`);
    }
    
    console.log('📊 URef bytes:', urefAddr);
    
    // Build the dictionary item key according to Odra's serialization
    // Key structure: mapping_name_length (u32 LE) + mapping_name + Address
    
    const mappingName = "credentials";
    const mappingNameBytes = Buffer.from(mappingName, 'utf-8');
    
    // Length prefix (u32 little-endian)
    const mappingNameLen = Buffer.alloc(4);
    mappingNameLen.writeUInt32LE(mappingNameBytes.length, 0);
    
    console.log('📝 Mapping name:', mappingName);
    console.log('📝 Name length:', mappingNameBytes.length);
    
    // Address serialization: tag byte (0x00 for Account) + account hash (32 bytes)
    const addressTag = Buffer.from([0x00]);
    const cleanAccountHash = accountHash.replace('account-hash-', '');
    const accountHashBytes = Buffer.from(cleanAccountHash, 'hex');
    
    if (accountHashBytes.length !== 32) {
      throw new Error(`Invalid account hash length: ${accountHashBytes.length}, expected 32`);
    }
    
    // Full address = tag + hash
    const addressBytes = Buffer.concat([addressTag, accountHashBytes]);
    
    console.log('📍 Address bytes length:', addressBytes.length);
    
    // Complete key = length_prefix + name + address
    const keyBytes = Buffer.concat([
      mappingNameLen,
      mappingNameBytes,
      addressBytes
    ]);
    
    console.log('🔑 Full key length:', keyBytes.length);
    console.log('🔑 Key hex:', keyBytes.toString('hex'));
    
    // Seed for dictionary address = uref_bytes + key_bytes
    const seedBytes = Buffer.concat([urefBytes, keyBytes]);
    
    console.log('🌱 Seed length:', seedBytes.length);
    
    // Hash with blake2b-256 (32 bytes output)
    const hash = crypto.createHash('blake2b512').update(seedBytes).digest();
    
    // Take first 32 bytes
    const dictAddr = hash.slice(0, 32).toString('hex');
    const dictionaryAddress = `dictionary-${dictAddr}`;
    
    console.log('✅ Computed dictionary:', dictionaryAddress);
    
    res.json({
      success: true,
      dictionaryAddress,
      debug: {
        stateUref,
        accountHash,
        mappingName,
        urefLength: urefBytes.length,
        keyLength: keyBytes.length,
        seedLength: seedBytes.length,
        computed: dictionaryAddress
      }
    });
    
  } catch (err) {
    console.error('❌ Error computing dictionary:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * API Endpoint: Get credential by deploy hash
 */
app.get('/api/credential/deploy/:deployHash', async (req, res) => {
  try {
    const { deployHash } = req.params;
    
    // Step 1: Get the deploy
    const deployData = await casperRPC('info_get_deploy', [deployHash]);
    
    if (!deployData.execution_info) {
      return res.status(404).json({ 
        error: 'Deploy not executed yet. Wait a few seconds and try again.' 
      });
    }
    
    // Step 2: Find credential dictionary write
    const effects = deployData.execution_info.execution_result?.Version2?.effects || [];
    
    const credentialWrite = effects.find(effect => 
      effect.key?.startsWith('dictionary-') && 
      effect.kind?.Write?.CLValue?.cl_type === 'Any' &&
      effect.kind?.Write?.CLValue?.bytes?.length > 300
    );
    
    if (!credentialWrite) {
      return res.status(404).json({ 
        error: 'No credential found in this deploy. Make sure this is a mint deploy.' 
      });
    }
    
    const dictionaryKey = credentialWrite.key;
    const hexBytes = credentialWrite.kind.Write.CLValue.bytes;
    
    // Step 3: Parse the credential
    const parsed = parseCredential(hexBytes);
    
    // Step 4: Get user account from deploy args
    const userArg = deployData.deploy.session.StoredContractByHash?.args?.find(
      arg => arg[0] === 'user'
    );
    
    const accountHash = userArg?.[1]?.parsed || 'unknown';
    
    res.json({
      success: true,
      credential: {
        ...parsed,
        accountHash,
        dictionaryKey,
        deployHash,
        blockHeight: deployData.execution_info.block_height
      }
    });
    
  } catch (error) {
    console.error('Error fetching credential:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch credential' 
    });
  }
});

/**
 * API Endpoint: Get credential by dictionary key
 */
app.get('/api/credential/dictionary/:dictionaryKey', async (req, res) => {
  try {
    const { dictionaryKey } = req.params;
    
    // Step 1: Get state root hash
    const stateRootData = await casperRPC('chain_get_state_root_hash', []);
    const stateRootHash = stateRootData.state_root_hash;
    
    // Step 2: Query the dictionary
    const queryData = await casperRPC('query_global_state', {
      state_identifier: { StateRootHash: stateRootHash },
      key: dictionaryKey,
      path: []
    });
    
    const hexBytes = queryData.stored_value.CLValue.bytes;
    
    // Step 3: Parse the credential
    const parsed = parseCredential(hexBytes);
    
    res.json({
      success: true,
      credential: {
        ...parsed,
        dictionaryKey
      }
    });
    
  } catch (error) {
    console.error('Error fetching credential:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch credential' 
    });
  }
});

/**
 * API Endpoint: Get credential by account hash
 */
app.get('/api/credential/account/:accountHash', async (req, res) => {
  try {
    const { accountHash } = req.params;
    
    // This requires computing the dictionary key from the account hash
    // For Odra contracts, this is more complex and requires the seed URef
    
    res.status(501).json({ 
      error: 'Direct account lookup not yet implemented. Use deploy hash instead.' 
    });
    
  } catch (error) {
    console.error('Error fetching credential:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch credential' 
    });
  }
});

/**
 * Test Dictionary Lookup - For debugging
 */
app.post('/test-dict-lookup', async (req, res) => {
  try {
    const { publicKey } = req.body;
    
    console.log('🧪 Testing dictionary lookup for:', publicKey);
    
    // Convert to account hash
    const pk = CLPublicKey.fromHex(publicKey);
    const accountHashBytes = pk.toAccountHash();
    const accountHash = Buffer.from(accountHashBytes).toString('hex');
    
    console.log('1️⃣ Account hash:', accountHash);
    
    // Get state root
    const stateRootResp = await fetch(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_get_state_root_hash'
      })
    });
    const stateRootData = await stateRootResp.json();
    const stateRoot = stateRootData.result.state_root_hash;
    
    console.log('2️⃣ State root:', stateRoot);
    
    // Get contract to find state URef
    const contractResp = await fetch(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'state_get_item',
        params: {
          state_root_hash: stateRoot,
          key: `hash-${CONTRACT_HASH}`,
          path: []
        }
      })
    });
    const contractData = await contractResp.json();
    
    if (contractData.error) {
      throw new Error('Contract not found: ' + contractData.error.message);
    }
    
    const namedKeys = contractData.result.stored_value.Contract.named_keys || [];
    const stateEntry = namedKeys.find(nk => nk.name === 'state');
    
    if (!stateEntry) {
      throw new Error('State URef not found');
    }
    
    const stateUref = stateEntry.key;
    console.log('3️⃣ State URef:', stateUref);
    
    // Compute dictionary address
    const computeResp = await fetch(`${req.protocol}://${req.get('host')}/compute-odra-dict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stateUref,
        accountHash
      })
    });
    const computeData = await computeResp.json();
    
    if (!computeData.success) {
      throw new Error('Failed to compute dictionary');
    }
    
    const dictAddress = computeData.dictionaryAddress;
    console.log('4️⃣ Dictionary address:', dictAddress);
    
    // Try to query it
    const queryResp = await fetch(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'state_get_item',
        params: {
          state_root_hash: stateRoot,
          key: dictAddress,
          path: []
        }
      })
    });
    const queryData = await queryResp.json();
    
    console.log('5️⃣ Query result:', queryData.error ? 'NOT FOUND' : 'FOUND');
    
    res.json({
      success: true,
      publicKey,
      accountHash,
      stateUref,
      dictionaryAddress: dictAddress,
      found: !queryData.error,
      data: queryData.error ? null : queryData.result
    });
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Health Endpoint
 */
app.get('/health', async (_req, res) => {
  try {
    const status = await rpcClient.getStatus();
    res.json({
      status: 'ok',
      chain: status.chainspec_name,
      apiVersion: status.api_version,
      peers: status.peers.length,
      rpc: NODE_URL,
      contract: CONTRACT_HASH,
      cors: 'enabled',
      rpcProxy: 'enabled'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

/**
 * API Health check endpoint (alias)
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    node: NODE_URL,
    contract: CONTRACT_HASH
  });
});

/**
 * Deploy Status
 */
app.get('/deploy-status/:hash', async (req, res) => {
  try {
    const info = await rpcClient.getDeployInfo(req.params.hash);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Start Server
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CasperCred API running on port ${PORT}`);
  console.log(`📡 Connected to Casper node: ${NODE_URL}`);
  console.log(`📝 Contract: ${CONTRACT_HASH}`);
  console.log(`\n🔧 API Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/credential/deploy/:deployHash`);
  console.log(`   GET  /api/credential/dictionary/:dictionaryKey`);
  console.log(`   GET  /api/credential/account/:accountHash`);
  console.log(`   GET  /deploy-status/:hash`);
  console.log(`   POST /submit-deploy`);
  console.log(`   POST /rpc (RPC Proxy)`);
  console.log(`   POST /compute-odra-dict`);
  console.log(`   POST /test-dict-lookup`);
  console.log(`\n✅ Server ready!\n`);
});