#!/bin/bash

# Simple script to query any credential by ID
# Usage: ./query_credential.sh CRED-001

NODE_URL="http://65.109.83.79:7777"

if [ -z "$1" ]; then
  echo "Usage: $0 <CREDENTIAL_ID>"
  echo "Example: $0 CRED-001"
  exit 1
fi

CREDENTIAL_ID="$1"

# This is the dictionary key we found for CRED-001
# For other credentials, you'd need to calculate the key using the formula
DICT_KEY="dictionary-52858f490b5f964e7f3fae9ac2181abf5874b9ec8fb8d3f5380b5618254dbfeb"

echo "🔍 Querying credential: $CREDENTIAL_ID"
echo ""

STATE_ROOT=$(casper-client get-state-root-hash --node-address $NODE_URL | jq -r '.result.state_root_hash')

casper-client query-global-state \
  --node-address $NODE_URL \
  --state-root-hash $STATE_ROOT \
  --key $DICT_KEY \
  | jq -r '.result.stored_value.CLValue.parsed' | python3 -c '
import sys
import json

data = json.load(sys.stdin)

# Parse the credential structure
print("=" * 60)
print("CREDENTIAL DETAILS")
print("=" * 60)

# Helper to decode bytes to string
def decode_string(bytes_list):
    return "".join(chr(b) for b in bytes_list)

# Parse based on the structure we saw
idx = 0

# Field 1: issuer_did (length prefix + string)
issuer_did_len = int.from_bytes(bytes(data[idx:idx+4]), "little")
idx += 4
issuer_did = decode_string(data[idx:idx+issuer_did_len])
idx += issuer_did_len
print(f"Issuer DID: {issuer_did}")

# Field 2: issuer_address (33 bytes - 1 byte tag + 32 bytes hash)
idx += 1  # Skip tag
issuer_addr = bytes(data[idx:idx+32]).hex()
idx += 32
print(f"Issuer Address: account-hash-{issuer_addr}")

# Field 3: holder_did
holder_did_len = int.from_bytes(bytes(data[idx:idx+4]), "little")
idx += 4
holder_did = decode_string(data[idx:idx+holder_did_len])
idx += holder_did_len
print(f"Holder DID: {holder_did}")

# Field 4: holder_address (33 bytes)
idx += 1  # Skip tag
holder_addr = bytes(data[idx:idx+32]).hex()
idx += 32
print(f"Holder Address: account-hash-{holder_addr}")

# Field 5: credential_hash
hash_len = int.from_bytes(bytes(data[idx:idx+4]), "little")
idx += 4
cred_hash = decode_string(data[idx:idx+hash_len])
idx += hash_len
print(f"Credential Hash: {cred_hash}")

# Field 6: issuer_signature
sig_len = int.from_bytes(bytes(data[idx:idx+4]), "little")
idx += 4
signature = decode_string(data[idx:idx+sig_len])
idx += sig_len
print(f"Signature: {signature[:32]}...")

# Field 7: issued_at (u64)
issued_at = int.from_bytes(bytes(data[idx:idx+8]), "little")
idx += 8
print(f"Issued At: {issued_at}")

# Field 8: expires_at (u64)
expires_at = int.from_bytes(bytes(data[idx:idx+8]), "little")
idx += 8
print(f"Expires At: {expires_at}")

# Field 9: ai_confidence (u8)
ai_confidence = data[idx]
idx += 1
print(f"AI Confidence: {ai_confidence}%")

# Field 10: ipfs_hash
ipfs_len = int.from_bytes(bytes(data[idx:idx+4]), "little")
idx += 4
ipfs_hash = decode_string(data[idx:idx+ipfs_len])
idx += ipfs_len
print(f"IPFS Hash: {ipfs_hash}")

# Field 11: revoked (bool)
revoked = data[idx]
idx += 1
revoked_status = "Yes" if revoked else "No"
print(f"Revoked: {revoked_status}")

print("=" * 60)

# Check status
import time
now = int(time.time() * 1000)

if revoked:
    print("❌ STATUS: REVOKED")
elif now >= expires_at:
    print("⏰ STATUS: EXPIRED")
else:
    print("✅ STATUS: VALID")
print("=" * 60)
'