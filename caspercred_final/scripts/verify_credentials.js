#!/usr/bin/env node

/**
 * CasperCredIQ Verification Script
 * Uses Odra's built-in contract methods instead of manual dictionary queries
 */

const { CasperClient, CLPublicKey, Contracts } = require('casper-js-sdk');

// Configuration
const NODE_URL = 'http://65.109.83.79:7777/rpc';
const CONTRACT_HASH = 'hash-YOUR_CONTRACT_HASH_HERE'; // Replace with your actual contract hash

// Test credentials to verify
const TEST_CREDENTIALS = [
  'TEST_VERIFY_01',
  'FRESH_TEST'
];

// Initialize Casper client
const client = new CasperClient(NODE_URL);
const contract = new Contracts.Contract(client);

async function main() {
  console.log('🔍 CasperCredIQ Credential Verification');
  console.log('========================================\n');
  
  try {
    // Set contract hash
    contract.setContractHash(CONTRACT_HASH);
    
    for (const credId of TEST_CREDENTIALS) {
      await verifyCredential(credId);
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Verify a credential using Odra contract methods
 */
async function verifyCredential(credentialId) {
  console.log(`📋 Verifying: ${credentialId}`);
  console.log('-'.repeat(80));
  
  try {
    // 1. Quick validity check
    const isValid = await callContractMethod('verify_credential', [credentialId]);
    console.log(`\n✨ Quick Check: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    // 2. Get holder address
    const holder = await callContractMethod('get_holder', [credentialId]);
    console.log(`\n👤 Holder:`);
    if (holder) {
      console.log(`   ${holder}`);
    } else {
      console.log(`   ⚠️  Credential not found`);
      return;
    }
    
    // 3. Get issuer address
    const issuer = await callContractMethod('get_issuer', [credentialId]);
    console.log(`\n🏢 Issuer:`);
    console.log(`   ${issuer || 'N/A'}`);
    
    // 4. Get AI confidence score
    const confidence = await callContractMethod('get_confidence', [credentialId]);
    console.log(`\n🤖 AI Confidence Score:`);
    if (confidence !== null) {
      console.log(`   ${confidence}/100`);
      console.log(`   ${'█'.repeat(Math.floor(confidence/5))}${'░'.repeat(20 - Math.floor(confidence/5))} ${confidence}%`);
    } else {
      console.log(`   ⚠️  Access denied or not available`);
    }
    
    // 5. Check revocation status
    const isRevoked = await callContractMethod('is_revoked', [credentialId]);
    console.log(`\n🚫 Revocation Status:`);
    if (isRevoked !== null) {
      console.log(`   ${isRevoked ? '❌ REVOKED' : '✅ Active'}`);
    } else {
      console.log(`   ⚠️  Access denied or not available`);
    }
    
    // 6. Get expiry timestamp
    const expiry = await callContractMethod('get_expiry', [credentialId]);
    console.log(`\n⏰ Expiry:`);
    if (expiry !== null) {
      const expiryDate = new Date(Number(expiry));
      const now = new Date();
      const isExpired = now > expiryDate;
      
      console.log(`   Date: ${expiryDate.toLocaleString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      
      if (!isExpired) {
        const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
        console.log(`   Days remaining: ${daysLeft}`);
      }
    } else {
      console.log(`   ⚠️  Access denied or not available`);
    }
    
    // 7. Get IPFS hash
    const ipfsHash = await callContractMethod('get_ipfs_hash', [credentialId]);
    console.log(`\n📎 IPFS Hash:`);
    if (ipfsHash) {
      console.log(`   ${ipfsHash}`);
      console.log(`   🔗 https://ipfs.io/ipfs/${ipfsHash}`);
    } else {
      console.log(`   ⚠️  Access denied or not available`);
    }
    
    // 8. Final summary
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Exists: ✅ Yes`);
    console.log(`   Valid: ${isValid ? '✅ Yes' : '❌ No'}`);
    if (isRevoked !== null) {
      console.log(`   Revoked: ${isRevoked ? '❌ Yes' : '✅ No'}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error verifying ${credentialId}:`, error.message);
  }
}

/**
 * Call a contract method using Odra's entry points
 */
async function callContractMethod(methodName, args) {
  try {
    const result = await contract.queryContractData([
      methodName,
      ...args
    ]);
    
    return parseResult(result);
  } catch (error) {
    console.error(`⚠️  Error calling ${methodName}:`, error.message);
    return null;
  }
}

/**
 * Parse the result from contract query
 */
function parseResult(result) {
  if (!result) return null;
  
  // Handle different return types
  if (typeof result === 'string') return result;
  if (typeof result === 'number') return result;
  if (typeof result === 'boolean') return result;
  
  // Handle CLValue types
  if (result.CLValue) {
    const clValue = result.CLValue;
    
    // Parse based on cl_type
    if (clValue.cl_type === 'Bool') {
      return clValue.parsed;
    } else if (clValue.cl_type === 'U8' || clValue.cl_type === 'U64') {
      return parseInt(clValue.parsed);
    } else if (clValue.cl_type === 'String') {
      return clValue.parsed;
    } else if (clValue.cl_type && clValue.cl_type.ByteArray) {
      // Address type
      return `account-hash-${Buffer.from(clValue.bytes, 'hex').toString('hex')}`;
    }
  }
  
  return result;
}

/**
 * Alternative: Batch verification for multiple credentials
 */
async function batchVerify(credentialIds) {
  console.log(`\n📦 Batch Verifying ${credentialIds.length} credentials...\n`);
  
  const results = [];
  
  for (const credId of credentialIds) {
    const isValid = await callContractMethod('verify_credential', [credId]);
    const holder = await callContractMethod('get_holder', [credId]);
    
    results.push({
      credentialId: credId,
      exists: holder !== null,
      valid: isValid,
      holder: holder
    });
  }
  
  // Display summary table
  console.log('┌─────────────────────┬────────┬────────┬──────────────────────────────────┐');
  console.log('│ Credential ID       │ Exists │ Valid  │ Holder                           │');
  console.log('├─────────────────────┼────────┼────────┼──────────────────────────────────┤');
  
  results.forEach(r => {
    const existsIcon = r.exists ? '✅' : '❌';
    const validIcon = r.valid ? '✅' : '❌';
    const holderShort = r.holder ? r.holder.substring(0, 30) + '...' : 'N/A';
    
    console.log(`│ ${r.credentialId.padEnd(19)} │ ${existsIcon}    │ ${validIcon}    │ ${holderShort.padEnd(32)} │`);
  });
  
  console.log('└─────────────────────┴────────┴────────┴──────────────────────────────────┘');
  
  return results;
}

// Run main function
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as module
module.exports = {
  verifyCredential,
  batchVerify,
  callContractMethod
};