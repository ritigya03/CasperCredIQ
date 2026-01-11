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

