#!/usr/bin/env python3
import hashlib
import struct

state_uref = "uref-cba216bb0cfce8922e46d178c9e65a75b821ea85599abe811700dbe07cb4e13f-007"
uref_addr = state_uref.replace('uref-', '').split('-')[0]

# Try with SCALE encoding (used in Substrate/Polkadot)
# In SCALE: compact integers are encoded differently

def scale_encode_string(s):
    """SCALE encode a string"""
    bytes_data = s.encode('utf-8')
    length = len(bytes_data)
    
    # Compact encoding for length
    if length < 64:
        # Single byte mode: upper 2 bits = 00, lower 6 bits = length
        length_bytes = bytes([length << 2])
    elif length < 16384:
        # Two byte mode: upper 2 bits = 01, lower 14 bits = length
        length_bytes = struct.pack('<H', (length << 2) | 1)
    elif length < 1073741824:
        # Four byte mode: upper 2 bits = 10, lower 30 bits = length
        length_bytes = struct.pack('<I', (length << 2) | 2)
    else:
        # Big integer mode (unlikely for our use case)
        raise ValueError("String too long")
    
    return length_bytes + bytes_data

# Known data
known_hashes = {
    "TEST_VERIFY_01": {
        "cred_holder": "19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915",
        "cred_revoked": "656f1333aee5cdcf4b64da8fcc06b9d5c8269776631c3b8b95a684660b125bfe",
        "cred_expires": "cd682e658b51963f9718eacff74da2f1532ebf28a317f5c69039576c1e7e8ca6",
        "cred_issuer": "9e60800be1d208524fbcb569c1a56943457ddd30483ec3248f7182034dc014f8",
        "cred_confidence": "0ffdb027f8a91eb27162fa7dd14ad22d492a5e8a7c7270b372fa8c05714c5324",
        "cred_ipfs": "59cf645ab10ccf75bd6037686110df2c54f16876630710f2dcb3474b6dc4bc62",
    },
    "FRESH_TEST": {
        "cred_issuer": "6352125221e6930bb7f3c1758c6ffe59b419d0c666702b6f1171855e14327d7c",
        "cred_confidence": "eacf1f5d1c11758b392265a7b11839b572451483d044eb840bc3520106ec6cf7",
    }
}

print("🔍 Testing SCALE encoding variations")
print("=" * 60)

# Different URef formats
uref_formats = [
    ("UREF without access", bytes.fromhex(uref_addr)),
    ("UREF full hex", bytes.fromhex(state_uref.replace('uref-', '').replace('-007', ''))),
    ("UREF as string", state_uref.encode()),
]

# Different encoding combinations
encodings = [
    ("Mapping + Key (SCALE)", 
     lambda m, k: scale_encode_string(m) + scale_encode_string(k)),
    
    ("Key + Mapping (SCALE)", 
     lambda m, k: scale_encode_string(k) + scale_encode_string(m)),
    
    ("Mapping_len(LE) + Mapping + Key_len(LE) + Key",
     lambda m, k: struct.pack('<I', len(m)) + m.encode() + struct.pack('<I', len(k)) + k.encode()),
    
    ("Mapping_len(BE) + Mapping + Key_len(BE) + Key",
     lambda m, k: struct.pack('>I', len(m)) + m.encode() + struct.pack('>I', len(k)) + k.encode()),
    
    # Maybe with special prefix
    ("With 0x00 prefix", 
     lambda m, k: b'\x00' + struct.pack('<I', len(m)) + m.encode() + struct.pack('<I', len(k)) + k.encode()),
    
    # Maybe Odra uses borsh encoding (used in NEAR)
    ("Borsh-like", 
     lambda m, k: struct.pack('<I', len(m)) + m.encode() + struct.pack('<I', len(k)) + k.encode()),
]

best_match = 0
best_combo = None

for uref_name, uref_bytes in uref_formats:
    print(f"\n📦 URef format: {uref_name}")
    print("-" * 40)
    
    for enc_name, enc_func in encodings:
        matches = 0
        total = 0
        
        for cred_id, mappings in known_hashes.items():
            for mapping, expected_hash in mappings.items():
                total += 1
                
                # Create seed
                data = enc_func(mapping, cred_id)
                seed = uref_bytes + data
                
                # Hash
                hash_obj = hashlib.blake2b(seed, digest_size=32)
                computed = hash_obj.hexdigest()
                
                if computed == expected_hash:
                    matches += 1
        
        print(f"  {enc_name}: {matches}/{total} matches")
        
        if matches > best_match:
            best_match = matches
            best_combo = (uref_name, enc_name)
            if matches == total:
                print(f"  🎉 PERFECT MATCH!")
                # Show example
                example_data = enc_func("cred_holder", "TEST_VERIFY_01")
                example_seed = uref_bytes + example_data
                print(f"  Example seed length: {len(example_seed)}")
                print(f"  Example seed hex: {example_seed.hex()[:80]}...")
                break
    
    if best_match == total:
        break

print(f"\n🏆 Best result: {best_match}/9 matches with {best_combo}")