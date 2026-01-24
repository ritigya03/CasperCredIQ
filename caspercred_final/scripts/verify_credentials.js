#!/usr/bin/env node

// Query any credential by calculating its dictionary key
// Usage: node query_credential.js CRED-001

const crypto = require('crypto');
const { execSync } = require('child_process');

const NODE_URL = "http://65.109.83.79:7777";
const STATE_UREF = "uref-503935b580f453cbf77c844665415b00295f233e3ffa954065bb07c30536fffa-007";
const FIELD_NAME = "__CasperCredIQ__credentials";

if (process.argv.length < 3) {
  console.log("Usage: node query_credential.js <CREDENTIAL_ID>");
  console.log("Example: node query_credential.js CRED-001");
  process.exit(1);
}

const CREDENTIAL_ID = process.argv[2];

// Helper: Convert hex string to bytes
function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return Buffer.from(bytes);
}

// Helper: Blake2b hash (256-bit)
function blake2b256(data) {
  return crypto.createHash('blake2b512')
    .update(data)
    .digest()
    .slice(0, 32);
}

// Calculate dictionary key using Odra's formula
function calculateDictionaryKey(stateUref, fieldName, itemKey) {
  // Step 1: Extract URef bytes (remove "uref-" prefix and "-007" suffix)
  const hexPart = stateUref.replace('uref-', '').split('-')[0];
  const urefBytes = hexToBytes(hexPart);
  
  // Step 2: Hash the field name
  const fieldHash = blake2b256(Buffer.from(fieldName, 'utf8'));
  
  // Step 3: Prepare item key bytes
  const itemKeyBytes = Buffer.from(itemKey, 'utf8');
  
  // Step 4: Concatenate and hash
  const combined = Buffer.concat([urefBytes, fieldHash, itemKeyBytes]);
  const finalHash = blake2b256(combined);
  
  return 'dictionary-' + finalHash.toString('hex');
}

// Calculate the dictionary key
const dictionaryKey = calculateDictionaryKey(STATE_UREF, FIELD_NAME, CREDENTIAL_ID);

console.log('🔍 Querying credential:', CREDENTIAL_ID);
console.log('📋 Calculated dictionary key:', dictionaryKey);
console.log('');

// Get state root hash
const stateRootCmd = `casper-client get-state-root-hash --node-address ${NODE_URL} | jq -r '.result.state_root_hash'`;
const stateRoot = execSync(stateRootCmd).toString().trim();

// Query the credential
const queryCmd = `casper-client query-global-state \\
  --node-address ${NODE_URL} \\
  --state-root-hash ${stateRoot} \\
  --key ${dictionaryKey}`;

try {
  const result = execSync(queryCmd).toString();
  const data = JSON.parse(result);
  
  if (data.error) {
    console.log('❌ Credential not found');
    console.log('Error:', data.error.message);
    process.exit(1);
  }
  
  // Parse the credential data
  const parsed = data.result.stored_value.CLValue.parsed;
  
  console.log('='.repeat(60));
  console.log('CREDENTIAL DETAILS');
  console.log('='.repeat(60));
  
  parseCredential(parsed);
  
} catch (error) {
  console.log('❌ Failed to query credential');
  console.log('Error:', error.message);
  process.exit(1);
}

function parseCredential(data) {
  let idx = 0;
  
  function readU32() {
    const val = Buffer.from(data.slice(idx, idx + 4)).readUInt32LE();
    idx += 4;
    return val;
  }
  
  function readU64() {
    const val = Buffer.from(data.slice(idx, idx + 8)).readBigUInt64LE();
    idx += 8;
    return Number(val);
  }
  
  function readString() {
    const len = readU32();
    const str = String.fromCharCode(...data.slice(idx, idx + len));
    idx += len;
    return str;
  }
  
  function readAddress() {
    idx += 1; // Skip tag
    const addr = Buffer.from(data.slice(idx, idx + 32)).toString('hex');
    idx += 32;
    return `account-hash-${addr}`;
  }
  
  // Parse fields
  const issuerDid = readString();
  const issuerAddress = readAddress();
  const holderDid = readString();
  const holderAddress = readAddress();
  const credentialHash = readString();
  const issuerSignature = readString();
  const issuedAt = readU64();
  const expiresAt = readU64();
  const aiConfidence = data[idx++];
  const ipfsHash = readString();
  const revoked = data[idx++] !== 0;
  
  console.log('Issuer DID:', issuerDid);
  console.log('Issuer Address:', issuerAddress);
  console.log('Holder DID:', holderDid);
  console.log('Holder Address:', holderAddress);
  console.log('Credential Hash:', credentialHash);
  console.log('Signature:', issuerSignature.substring(0, 32) + '...');
  console.log('Issued At:', new Date(issuedAt).toLocaleString());
  console.log('Expires At:', new Date(expiresAt).toLocaleString());
  console.log('AI Confidence:', aiConfidence + '%');
  console.log('IPFS Hash:', ipfsHash);
  console.log('Revoked:', revoked ? 'Yes' : 'No');
  console.log('='.repeat(60));
  
  const now = Date.now();
  if (revoked) {
    console.log('❌ STATUS: REVOKED');
  } else if (now >= expiresAt) {
    console.log('⏰ STATUS: EXPIRED');
  } else {
    console.log('✅ STATUS: VALID');
  }
  console.log('='.repeat(60));
}