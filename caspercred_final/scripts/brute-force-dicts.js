#!/usr/bin/env node

/**
 * CasperCredIQ Verification - Direct Dictionary Method
 * Query dictionaries directly without needing contract hash
 */

const NODE_URL = 'http://65.109.83.79:7777/rpc';

// Known dictionary mappings for each credential
const CREDENTIALS = {
  'TEST_VERIFY_01': {
    holder: 'dictionary-19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915',
    revoked: 'dictionary-656f1333aee5cdcf4b64da8fcc06b9d5c8269776631c3b8b95a684660b125bfe',
    expires: 'dictionary-cd682e658b51963f9718eacff74da2f1532ebf28a317f5c69039576c1e7e8ca6',
    issuer: 'dictionary-9e60800be1d208524fbcb569c1a56943457ddd30483ec3248f7182034dc014f8',
    confidence: 'dictionary-0ffdb027f8a91eb27162fa7dd14ad22d492a5e8a7c7270b372fa8c05714c5324',
    ipfs: 'dictionary-59cf645ab10ccf75bd6037686110df2c54f16876630710f2dcb3474b6dc4bc62'
  },
  'FRESH_TEST': {
    issuer: 'dictionary-9e60800be1d208524fbcb569c1a56943457ddd30483ec3248f7182034dc014f8',
    confidence: 'dictionary-0ffdb027f8a91eb27162fa7dd14ad22d492a5e8a7c7270b372fa8c05714c5324'
  }
};

/**
 * Get state root hash
 */
async function getStateRootHash() {
  const response = await fetch(NODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'chain_get_state_root_hash',
      params: []
    })
  });
  
  const data = await response.json();
  return data.result.state_root_hash;
}

/**
 * Query a dictionary directly by its key
 */
async function queryDictionary(stateRootHash, dictKey) {
  try {
    const response = await fetch(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'query_global_state',
        params: {
          state_identifier: {
            StateRootHash: stateRootHash
          },
          key: dictKey,
          path: []
        }
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return null;
    }
    
    return data.result?.stored_value?.CLValue?.bytes || null;
  } catch (error) {
    console.error(`   ⚠️  Error querying ${dictKey}:`, error.message);
    return null;
  }
}

/**
 * Parse address from hex bytes
 */
function parseAddress(hexBytes) {
  if (!hexBytes) return null;
  const cleanHex = hexBytes.replace(/^0x/, '');
  // First byte is length (21 = 0x21), next byte is tag (00 for account hash)
  // Remaining 32 bytes are the hash
  const hash = cleanHex.substring(4);
  return `account-hash-${hash}`;
}

/**
 * Parse boolean from hex bytes
 */
function parseBool(hexBytes) {
  if (!hexBytes) return false;
  const cleanHex = hexBytes.replace(/^0x/, '');
  // First 8 chars are length prefix (01000000 = 1 byte)
  // Next 2 chars are the boolean value (01 = true, 00 = false)
  return cleanHex.substring(8, 10) === '01';
}

/**
 * Parse U8 from hex bytes
 */
function parseU8(hexBytes) {
  if (!hexBytes) return null;
  const cleanHex = hexBytes.replace(/^0x/, '');
  // First 8 chars are length prefix
  // Next 2 chars are the U8 value
  return parseInt(cleanHex.substring(8, 10), 16);
}

/**
 * Parse U64 timestamp from hex bytes
 */
function parseU64(hexBytes) {
  if (!hexBytes) return null;
  const cleanHex = hexBytes.replace(/^0x/, '');
  // First 8 chars are length prefix (08000000 = 8 bytes)
  // Next 16 chars are the U64 in little-endian
  const valueHex = cleanHex.substring(8, 24);
  
  // Convert little-endian to big-endian
  let reversed = '';
  for (let i = valueHex.length - 2; i >= 0; i -= 2) {
    reversed += valueHex.substring(i, i + 2);
  }
  
  return parseInt(reversed, 16);
}

/**
 * Parse string from hex bytes
 */
function parseString(hexBytes) {
  if (!hexBytes) return null;
  const cleanHex = hexBytes.replace(/^0x/, '');
  
  // First 8 chars are string length as U32 in little-endian
  const lengthHex = cleanHex.substring(0, 8);
  let reversedLength = '';
  for (let i = lengthHex.length - 2; i >= 0; i -= 2) {
    reversedLength += lengthHex.substring(i, i + 2);
  }
  const length = parseInt(reversedLength, 16);
  
  // Remaining chars are the UTF-8 string
  const stringHex = cleanHex.substring(8);
  
  let result = '';
  for (let i = 0; i < stringHex.length && i < length * 2; i += 2) {
    result += String.fromCharCode(parseInt(stringHex.substring(i, i + 2), 16));
  }
  
  return result;
}

/**
 * Verify a credential
 */
async function verifyCredential(credentialId, stateRoot) {
  console.log(`\n📋 Verifying: ${credentialId}`);
  console.log('='.repeat(80));
  
  const dicts = CREDENTIALS[credentialId];
  
  if (!dicts) {
    console.log(`\n⚠️  No dictionary mapping found for ${credentialId}`);
    console.log(`   Add the dictionary hashes to the CREDENTIALS object`);
    return;
  }
  
  try {
    // Query all fields
    const holderBytes = dicts.holder ? await queryDictionary(stateRoot, dicts.holder) : null;
    const revokedBytes = dicts.revoked ? await queryDictionary(stateRoot, dicts.revoked) : null;
    const expiresBytes = dicts.expires ? await queryDictionary(stateRoot, dicts.expires) : null;
    const issuerBytes = dicts.issuer ? await queryDictionary(stateRoot, dicts.issuer) : null;
    const confidenceBytes = dicts.confidence ? await queryDictionary(stateRoot, dicts.confidence) : null;
    const ipfsBytes = dicts.ipfs ? await queryDictionary(stateRoot, dicts.ipfs) : null;
    
    // Parse data
    const holder = parseAddress(holderBytes);
    const isRevoked = parseBool(revokedBytes);
    const expiryTimestamp = parseU64(expiresBytes);
    const issuer = parseAddress(issuerBytes);
    const confidence = parseU8(confidenceBytes);
    const ipfsHash = parseString(ipfsBytes);
    
    // Display results
    console.log(`\n👤 Holder:`);
    console.log(`   ${holder || 'N/A'}`);
    
    console.log(`\n🏢 Issuer:`);
    console.log(`   ${issuer || 'N/A'}`);
    
    console.log(`\n🤖 AI Confidence Score:`);
    if (confidence !== null) {
      console.log(`   ${confidence}/100`);
      const barLength = Math.floor(confidence / 5);
      console.log(`   ${'█'.repeat(barLength)}${'░'.repeat(20 - barLength)} ${confidence}%`);
    } else {
      console.log(`   N/A`);
    }
    
    console.log(`\n🚫 Revocation Status:`);
    console.log(`   ${isRevoked ? '❌ REVOKED' : '✅ Active'}`);
    
    console.log(`\n⏰ Expiry:`);
    if (expiryTimestamp) {
      const expiryDate = new Date(expiryTimestamp);
      const now = new Date();
      const isExpired = now > expiryDate;
      
      console.log(`   Date: ${expiryDate.toLocaleString()}`);
      console.log(`   Timestamp: ${expiryTimestamp}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      
      if (!isExpired) {
        const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
        console.log(`   Days remaining: ${daysLeft}`);
      }
    } else {
      console.log(`   N/A`);
    }
    
    console.log(`\n📎 IPFS Hash:`);
    if (ipfsHash) {
      console.log(`   ${ipfsHash}`);
      console.log(`   🔗 https://ipfs.io/ipfs/${ipfsHash}`);
    } else {
      console.log(`   N/A`);
    }
    
    // Calculate validity
    const isExpired = expiryTimestamp ? new Date() > new Date(expiryTimestamp) : false;
    const isValid = holder && !isRevoked && !isExpired;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Exists: ${holder ? '✅ Yes' : '❌ No'}`);
    console.log(`   Valid: ${isValid ? '✅ Yes' : '❌ No'}`);
    console.log(`   Revoked: ${isRevoked ? '❌ Yes' : '✅ No'}`);
    console.log(`   Expired: ${isExpired ? '❌ Yes' : '✅ No'}`);
    
    return {
      exists: !!holder,
      valid: isValid,
      holder,
      issuer,
      confidence,
      isRevoked,
      expiryTimestamp,
      ipfsHash
    };
    
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 CasperCredIQ Direct Dictionary Verification');
  console.log('===============================================\n');
  
  try {
    const stateRoot = await getStateRootHash();
    console.log(`📡 State Root: ${stateRoot}`);
    
    // Verify all known credentials
    for (const credId of Object.keys(CREDENTIALS)) {
      await verifyCredential(credId, stateRoot);
      console.log('\n');
    }
    
    console.log('\n💡 TO ADD MORE CREDENTIALS:');
    console.log('============================');
    console.log('Add dictionary mappings to the CREDENTIALS object:');
    console.log(`
CREDENTIALS['YOUR_CRED_ID'] = {
  holder: 'dictionary-XXXXX...',
  revoked: 'dictionary-XXXXX...',
  expires: 'dictionary-XXXXX...',
  issuer: 'dictionary-XXXXX...',
  confidence: 'dictionary-XXXXX...',
  ipfs: 'dictionary-XXXXX...'
};
    `);
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);