casper-client query-global-state \
  --node-address http://65.109.83.79:7777 \
  --state-root-hash d9c88f68a7bfad29521e7ba7a3bb027b279071facdd02c14e9ed1814c9de3a9e \
  --key hash-6bb3dcbde7218c1471a0387e2f20a1db55b7d98df3b27ce32e342c0bd12357e8#!/bin/bash

# Fixed RPC script: calculate-dicts-proper.sh

set -e

NODE_URL="http://65.109.83.79:7777/rpc"
CONTRACT_HASH="afd7ca51f8ab1d415b7abf2439074924bd486ad12f0babfdf539e891ef6c4a1a"
CREDENTIAL_ID="${1:-TEST_VERIFY_01}"

echo "🔍 Dictionary Discovery for: $CREDENTIAL_ID"
echo "============================================="

# Function for proper RPC calls
rpc_call() {
    local method="$1"
    shift
    local params="$@"
    
    curl -s -X POST "$NODE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}"
}

# Step 1: Get state root hash (correct format)
echo "📡 Step 1: Getting state root hash..."
STATE_RESPONSE=$(rpc_call "chain_get_state_root_hash" "[]")
STATE_ROOT=$(echo "$STATE_RESPONSE" | jq -r '.result.state_root_hash')
echo "✅ State root: $STATE_ROOT"
echo ""

# Step 2: Get contract (CORRECT FORMAT)
echo "📦 Step 2: Getting contract data..."
CONTRACT_RESPONSE=$(curl -s -X POST "$NODE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":2,
    \"method\":\"state_get_item\",
    \"params\":{
      \"state_root_hash\":\"$STATE_ROOT\",
      \"key\":\"hash-$CONTRACT_HASH\",
      \"path\":[]
    }
  }")

echo "Contract response status:"
echo "$CONTRACT_RESPONSE" | jq -r '.error // .result | if . then "Success" else "Error" end'

if echo "$CONTRACT_RESPONSE" | jq -r '.result.stored_value.Contract' >/dev/null 2>&1; then
  echo "✅ Contract found!"
  
  # Extract named keys
  echo -n "Looking for 'state' named key... "
  STATE_UREF=$(echo "$CONTRACT_RESPONSE" | jq -r '.result.stored_value.Contract.named_keys[] | select(.name=="state") | .key')
  
  if [ -n "$STATE_UREF" ] && [ "$STATE_UREF" != "null" ]; then
    echo "FOUND: $STATE_UREF"
  else
    echo "NOT FOUND"
    echo "Available named keys:"
    echo "$CONTRACT_RESPONSE" | jq -r '.result.stored_value.Contract.named_keys[] | "  - " + .name + ": " + .key'
  fi
else
  echo "❌ Could not parse contract response"
  echo "$CONTRACT_RESPONSE" | head -100
fi
echo ""

# Step 3: Test querying a known dictionary (CORRECT FORMAT)
echo "🔍 Step 3: Testing known dictionary query..."
echo ""

DICT_ADDRESS="dictionary-19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915"

QUERY_RESPONSE=$(curl -s -X POST "$NODE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":3,
    \"method\":\"state_get_item\",
    \"params\":{
      \"state_root_hash\":\"$STATE_ROOT\",
      \"key\":\"$DICT_ADDRESS\",
      \"path\":[]
    }
  }")

echo "Querying: $DICT_ADDRESS"
echo "Response:"

if echo "$QUERY_RESPONSE" | jq -r '.result.stored_value.CLValue' >/dev/null 2>&1; then
  echo "✅ Dictionary exists!"
  BYTES=$(echo "$QUERY_RESPONSE" | jq -r '.result.stored_value.CLValue.bytes')
  CL_TYPE=$(echo "$QUERY_RESPONSE" | jq -r '.result.stored_value.CLValue.cl_type')
  PARSED=$(echo "$QUERY_RESPONSE" | jq -r '.result.stored_value.CLValue.parsed // "not-parsed"')
  
  echo "   Bytes: ${BYTES:0:80}..."
  echo "   Type: $CL_TYPE"
  echo "   Parsed: $PARSED"
  
  # Try to parse as address
  if [[ ${#BYTES} -ge 66 ]] && [[ "$BYTES" =~ ^21 ]]; then
    ADDR_BYTES="${BYTES:2:64}"
    echo "   Holder address: account-hash-$ADDR_BYTES"
  fi
elif echo "$QUERY_RESPONSE" | jq -r '.error' >/dev/null 2>&1; then
  echo "❌ Error: $(echo "$QUERY_RESPONSE" | jq -r '.error.message')"
else
  echo "❌ No data found"
fi
echo ""

# Step 4: Let me write a Python script to compute possible dictionaries
echo "🎯 Step 4: Computing possible dictionary addresses..."
echo ""

cat > compute_dicts.py << 'EOF'
import hashlib
import struct
from hashlib import blake2b

# Known dictionaries for TEST_VERIFY_01
known_dicts = {
    'holder': '19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915',
    'revoked': '656f1333aee5cdcf4b64da8fcc06b9d5c8269776631c3b8b95a684660b125bfe',
    'expires': 'cd682e658b51963f9718eacff74da2f1532ebf28a317f5c69039576c1e7e8ca6',
    'issuer': '9e60800be1d208524fbcb569c1a56943457ddd30483ec3248f7182034dc014f8',
    'ai_confidence': '0ffdb027f8a91eb27162fa7dd14ad22d492a5e8a7c7270b372fa8c05714c5324',
    'unknown': 'de9b9c124ceac654c1f413e4e8a66aca6e020c4d0b9c50faa22038ff9b5fbd73',
    'ipfs': '59cf645ab10ccf75bd6037686110df2c54f16876630710f2dcb3474b6dc4bc62'
}

# We need to guess: state_uref + mapping_name + credential_id
# Let's try to find patterns

print("🔍 Analyzing dictionary hash patterns...")
print("=" * 50)

# Print first few chars of each hash
for name, hash_val in known_dicts.items():
    print(f"{name:15} {hash_val[:8]}...{hash_val[-8:]}")
    print(f"{' ' * 15} Full: {hash_val}")

print("\n🧪 Let's test if these are blake2b-256 hashes...")
print("=" * 50)

# Test credential ID
credential_id = "TEST_VERIFY_01"
print(f"Credential ID: '{credential_id}'")
print(f"Length: {len(credential_id)} chars")
print(f"Bytes: {credential_id.encode('utf-8').hex()}")

# Common mapping name patterns to test
mapping_candidates = [
    "holder",
    "cred_holder",
    "credential_holder",
    "revoked",
    "cred_revoked",
    "expires",
    "cred_expires",
    "issuer",
    "cred_issuer",
    "ai_confidence",
    "cred_ai_confidence",
    "unknown",
    "cred_unknown",
    "ipfs",
    "cred_ipfs",
    "metadata",
    "cred_metadata"
]

print(f"\n📝 Will test {len(mapping_candidates)} mapping name candidates")
print("Run the Node.js script for actual computation tests")

EOF

python3 compute_dicts.py
echo ""

# Step 5: Create a proper Node.js test script
echo "🚀 Step 5: Creating Node.js brute-force discoverer..."
echo ""

cat > brute-force-dicts.js << 'EOF'
const crypto = require('crypto');

// Known dictionaries
const knownDicts = {
  holder: '19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915',
  revoked: '656f1333aee5cdcf4b64da8fcc06b9d5c8269776631c3b8b95a684660b125bfe',
  expires: 'cd682e658b51963f9718eacff74da2f1532ebf28a317f5c69039576c1e7e8ca6',
  issuer: '9e60800be1d208524fbcb569c1a56943457ddd30483ec3248f7182034dc014f8',
  ai_confidence: '0ffdb027f8a91eb27162fa7dd14ad22d492a5e8a7c7270b372fa8c05714c5324',
  unknown: 'de9b9c124ceac654c1f413e4e8a66aca6e020c4d0b9c50faa22038ff9b5fbd73',
  ipfs: '59cf645ab10ccf75bd6037686110df2c54f16876630710f2dcb3474b6dc4bc62'
};

// GUESS: State URef (we'll need the real one)
// From typical Odra patterns: uref-[hash]-007
const STATE_UREF_GUESS = 'uref-0000000000000000000000000000000000000000000000000000000000000000-007';
const CREDENTIAL_ID = 'TEST_VERIFY_01';

function blake2b256(data) {
  const hash = crypto.createHash('blake2b512').update(data).digest();
  return hash.slice(0, 32); // First 32 bytes
}

function testComputation(stateUrefHex, mappingName, credentialId, strategy) {
  const urefBytes = Buffer.from(stateUrefHex, 'hex');
  let keyBytes;
  
  switch(strategy) {
    case 1:
      // Length-prefixed strings
      const nameBytes = Buffer.from(mappingName, 'utf-8');
      const idBytes = Buffer.from(credentialId, 'utf-8');
      
      const nameLen = Buffer.alloc(4);
      nameLen.writeUInt32LE(nameBytes.length, 0);
      
      const idLen = Buffer.alloc(4);
      idLen.writeUInt32LE(idBytes.length, 0);
      
      keyBytes = Buffer.concat([nameLen, nameBytes, idLen, idBytes]);
      break;
      
    case 2:
      // Concatenated strings
      keyBytes = Buffer.concat([
        Buffer.from(mappingName, 'utf-8'),
        Buffer.from(credentialId, 'utf-8')
      ]);
      break;
      
    case 3:
      // Just credential ID
      keyBytes = Buffer.from(credentialId, 'utf-8');
      break;
      
    case 4:
      // With "cred_" prefix
      keyBytes = Buffer.concat([
        Buffer.from('cred_', 'utf-8'),
        Buffer.from(mappingName, 'utf-8'),
        Buffer.from(credentialId, 'utf-8')
      ]);
      break;
      
    default:
      return null;
  }
  
  const seedBytes = Buffer.concat([urefBytes, keyBytes]);
  const computedHash = blake2b256(seedBytes);
  return computedHash.toString('hex');
}

console.log('🔍 Brute-force Dictionary Discovery');
console.log('====================================\n');

// Extract URef hex (remove prefix and access rights)
const urefHex = STATE_UREF_GUESS.replace('uref-', '').split('-')[0];
console.log(`Using URef hex: ${urefHex} (GUESS - need real one)`);
console.log(`Credential ID: "${CREDENTIAL_ID}"\n`);

// Test mapping names
const mappingCandidates = [
  'holder', 'cred_holder',
  'revoked', 'cred_revoked',
  'expires', 'cred_expires',
  'issuer', 'cred_issuer',
  'ai_confidence', 'cred_ai_confidence',
  'unknown', 'cred_unknown',
  'ipfs', 'cred_ipfs'
];

console.log('Testing strategies...\n');

let found = false;

for (const mappingName of mappingCandidates) {
  for (let strategy = 1; strategy <= 4; strategy++) {
    const computed = testComputation(urefHex, mappingName, CREDENTIAL_ID, strategy);
    
    if (computed) {
      // Check if matches any known
      for (const [type, knownHash] of Object.entries(knownDicts)) {
        if (computed === knownHash) {
          console.log(`🎉 FOUND MATCH!`);
          console.log(`   Type: ${type}`);
          console.log(`   Mapping name: "${mappingName}"`);
          console.log(`   Strategy: ${strategy}`);
          console.log(`   Computed: ${computed}`);
          console.log(`   Known:    ${knownHash}`);
          found = true;
          break;
        }
      }
      
      if (found) break;
    }
  }
  if (found) break;
}

if (!found) {
  console.log('❌ No matches found with guessed state URef.');
  console.log('\n🚀 REQUIRED: Get the ACTUAL state URef from contract');
  console.log('   Run: casper-client query-global-state --key hash-[CONTRACT_HASH]');
  console.log('   Look for "state" named key');
}

EOF

echo "Node.js script created: brute-force-dicts.js"
echo ""
echo "📋 FINAL INSTRUCTIONS:"
echo "1. First, get the ACTUAL state URef from your contract:"
echo "   casper-client query-global-state \\"
echo "     --node-address http://65.109.83.79:7777/rpc \\"
echo "     --key hash-$CONTRACT_HASH \\"
echo "     | jq '.result.stored_value.Contract.named_keys[] | select(.name==\"state\") | .key'"
echo ""
echo "2. Update brute-force-dicts.js with the real state URef"
echo "3. Run: node brute-force-dicts.js"
echo ""
echo "This will find the exact computation algorithm!"