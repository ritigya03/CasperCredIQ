#!/usr/bin/env python3
"""
Simple tool to query and verify credentials
Uses direct RPC calls instead of casper-client when needed
"""

import json
import subprocess
import sys
import time
import requests

NODE_URL = "http://65.109.83.79:7777/rpc"
CONTRACT_HASH = "7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd"

def rpc_call(method, params=None):
    """Make a direct JSON-RPC call to the Casper node"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    }
    
    try:
        response = requests.post(NODE_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"RPC error: {e}")
        return None

def get_state_root_hash():
    """Get the current state root hash"""
    result = rpc_call("chain_get_state_root_hash")
    if result and 'result' in result:
        return result['result']['state_root_hash']
    return None

def query_dictionary_item(state_root_hash, contract_hash, dict_name, key):
    """Query a dictionary item"""
    params = {
        "state_root_hash": state_root_hash,
        "dictionary_identifier": {
            "ContractNamedKey": {
                "key": f"hash-{contract_hash}",
                "dictionary_name": dict_name,
                "dictionary_item_key": key
            }
        }
    }
    
    return rpc_call("state_get_dictionary_item", params)

def query_credential(cred_id):
    """Query a credential by ID"""
    print(f"\n{'='*60}")
    print(f"QUERYING CREDENTIAL ID: {cred_id}")
    print(f"{'='*60}\n")
    
    # Get state root
    print("Getting state root hash...")
    state_root = get_state_root_hash()
    if not state_root:
        print("❌ Failed to get state root hash")
        return None
    
    print(f"✅ State root: {state_root[:16]}...\n")
    
    # Try to query the credential
    print("Querying credentials dictionary...")
    result = query_dictionary_item(state_root, CONTRACT_HASH, "credentials", str(cred_id))
    
    if not result:
        print("❌ Query failed - no response")
        return None
    
    # Save raw result
    with open(f"credential_{cred_id}_raw.json", 'w') as f:
        json.dump(result, f, indent=2)
    print(f"✅ Saved raw response to credential_{cred_id}_raw.json")
    
    # Check for errors
    if 'error' in result:
        print(f"❌ Error: {result['error'].get('message', 'Unknown error')}")
        return None
    
    # Extract stored value
    if 'result' not in result or 'stored_value' not in result['result']:
        print("❌ No stored_value in result")
        print(f"Result structure: {json.dumps(result, indent=2)[:500]}")
        return None
    
    stored_value = result['result']['stored_value']
    
    # Parse the credential
    if 'CLValue' in stored_value:
        cl_value = stored_value['CLValue']
        
        print("\n✅ Found credential!\n")
        
        # Check if parsed
        if 'parsed' in cl_value and cl_value['parsed']:
            print("Credential Data:")
            print("-" * 60)
            parsed = cl_value['parsed']
            
            for key, value in parsed.items():
                if key in ['issued_at', 'expires_at']:
                    # Convert timestamp
                    try:
                        ts = int(value) / 1000
                        from datetime import datetime
                        dt = datetime.fromtimestamp(ts)
                        print(f"  {key:20s}: {value} ({dt.strftime('%Y-%m-%d %H:%M:%S')})")
                    except:
                        print(f"  {key:20s}: {value}")
                elif key == 'credential_hash' and len(str(value)) > 40:
                    print(f"  {key:20s}: {str(value)[:40]}...")
                elif key == 'revoked':
                    status = "❌ YES" if value else "✅ NO"
                    print(f"  {key:20s}: {status}")
                else:
                    print(f"  {key:20s}: {value}")
            
            # Save parsed
            with open(f"credential_{cred_id}_parsed.json", 'w') as f:
                json.dump(parsed, f, indent=2)
            print(f"\n✅ Saved parsed data to credential_{cred_id}_parsed.json")
            
            return parsed
        
        elif 'bytes' in cl_value:
            print(f"⚠️  Raw bytes only (length: {len(cl_value['bytes'])} chars)")
            print(f"   First 100 chars: {cl_value['bytes'][:100]}...")
            
            with open(f"credential_{cred_id}_bytes.hex", 'w') as f:
                f.write(cl_value['bytes'])
            print(f"✅ Saved to credential_{cred_id}_bytes.hex")
            
            return cl_value
    
    print("❌ Could not parse credential data")
    return None

def verify_credential(cred_id):
    """Verify a credential using casper-client"""
    print(f"\n{'='*60}")
    print(f"VERIFYING CREDENTIAL ID: {cred_id}")
    print(f"{'='*60}\n")
    
    cmd = f"""casper-client put-deploy \
        --node-address {NODE_URL} \
        --chain-name casper-test \
        --secret-key ./keys/secret_key.pem \
        --payment-amount 3000000000 \
        --session-hash {CONTRACT_HASH} \
        --session-entry-point "verify_credential" \
        --session-arg "credential_id:u256:'{cred_id}'" 2>&1"""
    
    try:
        output = subprocess.check_output(cmd, shell=True, text=True)
        
        # Extract JSON from output (skip warning lines)
        lines = output.strip().split('\n')
        json_str = None
        for i, line in enumerate(lines):
            if line.strip().startswith('{'):
                json_str = '\n'.join(lines[i:])
                break
        
        if not json_str:
            print(f"❌ Could not find JSON in output")
            return False
        
        data = json.loads(json_str)
        deploy_hash = data['result']['deploy_hash']
        
        print(f"✅ Deploy submitted: {deploy_hash}")
        print(f"🔗 https://testnet.cspr.live/deploy/{deploy_hash}")
        
        # Wait
        print("\nWaiting for execution", end='', flush=True)
        for _ in range(30):
            print('.', end='', flush=True)
            time.sleep(1)
        print()
        
        # Check result
        check_cmd = f"casper-client get-deploy --node-address {NODE_URL} {deploy_hash}"
        result = subprocess.check_output(check_cmd, shell=True, text=True)
        result_data = json.loads(result)
        
        error = result_data.get('result', {}).get('execution_info', {}).get(
            'execution_result', {}).get('Version2', {}).get('error_message')
        
        if not error or error == 'null':
            print("✅ VERIFICATION SUCCESSFUL - Credential is VALID")
            return True
        else:
            print(f"❌ VERIFICATION FAILED: {error}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def revoke_credential(cred_id, reason="Manual revocation"):
    """Revoke a credential"""
    print(f"\n{'='*60}")
    print(f"REVOKING CREDENTIAL ID: {cred_id}")
    print(f"{'='*60}\n")
    print(f"Reason: {reason}\n")
    
    confirm = input("Are you sure? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled")
        return False
    
    cmd = f"""casper-client put-deploy \
        --node-address {NODE_URL} \
        --chain-name casper-test \
        --secret-key ./keys/secret_key.pem \
        --payment-amount 4000000000 \
        --session-hash {CONTRACT_HASH} \
        --session-entry-point "revoke_credential" \
        --session-arg "credential_id:u256:'{cred_id}'" \
        --session-arg "reason:string:'{reason}'" 2>&1"""
    
    try:
        output = subprocess.check_output(cmd, shell=True, text=True)
        
        lines = output.strip().split('\n')
        json_str = None
        for i, line in enumerate(lines):
            if line.strip().startswith('{'):
                json_str = '\n'.join(lines[i:])
                break
        
        if not json_str:
            print("❌ Could not parse output")
            return False
        
        data = json.loads(json_str)
        deploy_hash = data['result']['deploy_hash']
        
        print(f"✅ Deploy submitted: {deploy_hash}")
        print(f"🔗 https://testnet.cspr.live/deploy/{deploy_hash}")
        
        # Wait
        print("\nWaiting for execution", end='', flush=True)
        for _ in range(30):
            print('.', end='', flush=True)
            time.sleep(1)
        print()
        
        # Check result
        check_cmd = f"casper-client get-deploy --node-address {NODE_URL} {deploy_hash}"
        result = subprocess.check_output(check_cmd, shell=True, text=True)
        result_data = json.loads(result)
        
        error = result_data.get('result', {}).get('execution_info', {}).get(
            'execution_result', {}).get('Version2', {}).get('error_message')
        
        if not error or error == 'null':
            print("✅ REVOCATION SUCCESSFUL")
            
            # Verify revoked
            print("\nChecking revocation status...")
            time.sleep(5)
            cred = query_credential(cred_id)
            if cred and cred.get('revoked'):
                print("✅ Confirmed: Credential is now REVOKED")
            
            return True
        else:
            print(f"❌ REVOCATION FAILED: {error}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("CasperCredIQ Simple Query & Verify Tool")
        print("\nUsage:")
        print(f"  {sys.argv[0]} query <id>      # Query and decode credential")
        print(f"  {sys.argv[0]} verify <id>     # Verify credential is valid")
        print(f"  {sys.argv[0]} revoke <id>     # Revoke credential")
        print(f"  {sys.argv[0]} test <id>       # Full test: query→verify→revoke")
        print("\nExamples:")
        print(f"  {sys.argv[0]} query 0")
        print(f"  {sys.argv[0]} test 0")
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == 'query':
        cred_id = sys.argv[2] if len(sys.argv) > 2 else '0'
        query_credential(cred_id)
    
    elif cmd == 'verify':
        cred_id = sys.argv[2] if len(sys.argv) > 2 else '0'
        verify_credential(cred_id)
    
    elif cmd == 'revoke':
        cred_id = sys.argv[2] if len(sys.argv) > 2 else '0'
        reason = sys.argv[3] if len(sys.argv) > 3 else "Manual revocation"
        revoke_credential(cred_id, reason)
    
    elif cmd == 'test':
        cred_id = sys.argv[2] if len(sys.argv) > 2 else '0'
        
        print("\n" + "="*60)
        print("FULL TEST SUITE")
        print("="*60)
        
        # Step 1: Query
        print("\n📋 Step 1/3: Query Credential")
        cred = query_credential(cred_id)
        if not cred:
            print("\n❌ Test failed - could not query credential")
            sys.exit(1)
        
        input("\nPress Enter to continue...")
        
        # Step 2: Verify
        print("\n✅ Step 2/3: Verify Credential")
        if not verify_credential(cred_id):
            print("\n⚠️  Verification failed, but continuing...")
        
        input("\nPress Enter to continue...")
        
        # Step 3: Revoke
        print("\n🚫 Step 3/3: Revoke Credential")
        revoke_credential(cred_id, "Full test suite")
        
        print("\n" + "="*60)
        print("✅ TEST COMPLETE")
        print("="*60)
    
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()