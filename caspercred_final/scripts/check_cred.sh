#!/bin/bash

# Credential Check Script
# Usage: ./cred_check.sh

set -e  # Exit on error

# Configuration
NODE_ADDRESS="http://65.109.83.79:7777/rpc"
DICTIONARY_KEY="dictionary-4e10e28720d50f01d3f6f7792009e96a0e43adb81921d259ee82516652053f1a"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
}

# Function to handle errors
handle_error() {
    echo -e "\n${RED}❌ Error: $1${NC}"
    echo -e "${YELLOW}Suggestion: $2${NC}"
    exit 1
}

# Function to get state root hash
get_state_root_hash() {
    echo -e "${YELLOW}Fetching state root hash...${NC}"
    STATE_ROOT_HASH=$(casper-client get-state-root-hash \
        --node-address "$NODE_ADDRESS" 2>/dev/null | jq -r '.result.state_root_hash')
    
    if [ -z "$STATE_ROOT_HASH" ] || [ "$STATE_ROOT_HASH" == "null" ]; then
        handle_error "Failed to get state root hash" \
            "Check if the node is running at $NODE_ADDRESS and you have network connectivity"
    fi
    echo -e "${GREEN}✓ State root hash obtained: ${STATE_ROOT_HASH:0:16}...${NC}"
}

# Function to query credential data
query_credential() {
    echo -e "\n${YELLOW}Querying credential data...${NC}"
    
    HEX_DATA=$(casper-client query-global-state \
        --node-address "$NODE_ADDRESS" \
        --state-root-hash "$STATE_ROOT_HASH" \
        --key "$DICTIONARY_KEY" 2>/dev/null | jq -r '.result.stored_value.CLValue.bytes')
    
    if [ -z "$HEX_DATA" ] || [ "$HEX_DATA" == "null" ]; then
        handle_error "Failed to query credential data" \
            "Check if the dictionary key exists and contains credential data"
    fi
    echo -e "${GREEN}✓ Credential data retrieved${NC}"
}

# Function to decode and display credential information
decode_credential() {
    python3 - <<EOF
import sys
import struct
from datetime import datetime as dt

try:
    # Convert hex to bytes
    d = bytes.fromhex("$HEX_DATA")
    o = 4  # Offset
    
    # Read role (string)
    rl = struct.unpack('<I', d[o:o+4])[0]
    o += 4
    role = d[o:o+rl].decode('utf-8')
    o += rl
    
    # Read timestamps
    issued_at = struct.unpack('<Q', d[o:o+8])[0]
    o += 8
    expires_at = struct.unpack('<Q', d[o:o+8])[0]
    o += 8
    
    # Read revoked status
    revoked = d[o] != 0
    o += 1
    
    # Read issuer
    issuer_bytes = d[o:o+32]
    issuer = 'account-hash-' + issuer_bytes.hex()
    
    # Current time
    now = dt.now().timestamp() * 1000
    
    # Format dates
    issued_str = dt.fromtimestamp(issued_at/1000).strftime("%Y-%m-%d %H:%M:%S UTC")
    expires_str = dt.fromtimestamp(expires_at/1000).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    # Calculate time remaining
    time_remaining = (expires_at - now) / 1000
    hours_remaining = time_remaining / 3600
    days_remaining = hours_remaining / 24
    
    # Determine status
    if revoked:
        status = "❌ REVOKED"
        status_color = "\\033[0;31m"
    elif now > expires_at:
        status = "❌ EXPIRED"
        status_color = "\\033[0;31m"
    else:
        status = "✅ VALID"
        status_color = "\\033[0;32m"
    
    # Print credential details
    print("\\033[0;32m✅ CREDENTIAL DETAILS\\033[0m")
    print("═" * 55)
    
    print(f"\\033[1;34mRole:\\033[0m            {role}")
    print(f"\\033[1;34mIssued At:\\033[0m        {issued_str}")
    print(f"\\033[1;34mExpires At:\\033[0m       {expires_str}")
    print("")
    
    if hours_remaining > 0:
        if days_remaining > 1:
            print(f"\\033[1;34mTime Remaining:\\033[0m    {days_remaining:.1f} days ({hours_remaining:.1f} hours)")
        else:
            print(f"\\033[1;34mTime Remaining:\\033[0m    {hours_remaining:.1f} hours")
    else:
        print(f"\\033[1;34mTime Remaining:\\033[0m    Expired")
    
    print(f"\\033[1;34mRevoked:\\033[0m          {'Yes' if revoked else 'No'}")
    print(f"\\033[1;34mIssuer:\\033[0m           {issuer[:20]}...")
    print("═" * 55)
    print(f"{status_color}{status}\\033[0m")
    print("═" * 55)
    
except Exception as e:
    print(f"\\033[0;31mError decoding credential data: {str(e)}\\033[0m")
    sys.exit(1)
EOF
}

# Main execution
main() {
    print_header "CREDENTIAL CHECK TOOL"
    
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Check if casper-client is installed
    if ! command -v casper-client &> /dev/null; then
        handle_error "casper-client not found" \
            "Install casper-client from: https://docs.casper.network/workflow/setup/"
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        handle_error "jq not found" \
            "Install jq using: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
    fi
    
    # Check if python3 is installed
    if ! command -v python3 &> /dev/null; then
        handle_error "python3 not found" \
            "Install python3 from: https://www.python.org/downloads/"
    fi
    
    echo -e "${GREEN}✓ All dependencies found${NC}"
    
    # Execute steps
    get_state_root_hash
    query_credential
    
    print_header "CREDENTIAL INFORMATION"
    decode_credential
}

# Run main function
main "$@"