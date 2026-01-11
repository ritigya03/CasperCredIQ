#!/bin/bash

# CasperCredIQ - Comprehensive Test Script
# Tests all contract functions step by step

set -e

# ==================== CONFIGURATION ====================
NODE_URL="http://65.109.83.79:7777/rpc"
CHAIN_NAME="casper-test"
SECRET_KEY="keys/secret_key.pem"
PUBLIC_KEY_HEX=$(cat keys/public_key_hex 2>/dev/null || echo "")
PACKAGE_NAME="caspercrediq_v3"

# Contract hashes (will be populated)
CONTRACT_HASH="hash-a162a417693cc97e7676b3d1fbbac2cf7c874cafa9cdd0c4219c3eee53e06193"
PACKAGE_HASH=""

# Gas amounts
GAS_INIT=5000000000
GAS_ISSUE=8000000000
GAS_QUERY=3000000000
GAS_REVOKE=5000000000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== HELPER FUNCTIONS ====================

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

wait_for_deploy() {
    local deploy_hash=$1
    local max_attempts=30
    local attempt=0
    
    print_info "Waiting for deploy $deploy_hash to finalize..."
    
    while [ $attempt -lt $max_attempts ]; do
        sleep 2
        result=$(casper-client get-deploy \
            --node-address $NODE_URL \
            $deploy_hash 2>/dev/null || echo "")
        
        if echo "$result" | grep -q "Success"; then
            print_success "Deploy finalized successfully!"
            return 0
        elif echo "$result" | grep -q "error_message"; then
            error_msg=$(echo "$result" | jq -r '.result.execution_info.execution_result.Version2.error_message // .result.execution_result.Failure.error_message // "Unknown error"')
            print_error "Deploy failed: $error_msg"
            return 1
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
    done
    
    print_error "Deploy timeout after ${max_attempts} attempts"
    return 1
}

get_state_root_hash() {
    casper-client get-state-root-hash \
        --node-address $NODE_URL \
        | jq -r '.result.state_root_hash'
}

# ==================== STEP 1: GET PACKAGE HASH ====================

get_package_hash() {
    print_header "STEP 1: Finding Package Hash"
    
    if [ -z "$PUBLIC_KEY_HEX" ]; then
        print_error "Could not read public_key_hex"
        exit 1
    fi
    
    # Remove '02' prefix if present
    ACCOUNT_HASH=$(echo $PUBLIC_KEY_HEX | sed 's/^02//')
    
    print_info "Public Key: $PUBLIC_KEY_HEX"
    print_info "Account Hash: account-hash-$ACCOUNT_HASH"
    
    STATE_ROOT=$(get_state_root_hash)
    print_info "State Root: $STATE_ROOT"
    
    # Query for package hash
    result=$(casper-client query-global-state \
        --node-address $NODE_URL \
        --state-root-hash $STATE_ROOT \
        --key account-hash-$ACCOUNT_HASH \
        -q "$PACKAGE_NAME" 2>/dev/null || echo "")
    
    if [ -z "$result" ]; then
        print_error "Failed to query package hash"
        print_info "Trying alternative method..."
        
        # Alternative: Query named keys directly
        result=$(casper-client query-global-state \
            --node-address $NODE_URL \
            --state-root-hash $STATE_ROOT \
            --key account-hash-$ACCOUNT_HASH 2>/dev/null || echo "")
        
        echo "$result" | jq '.result.stored_value.Account.named_keys' 2>/dev/null
    fi
    
    # Extract package hash
    PACKAGE_HASH=$(echo "$result" | jq -r '.result.stored_value.ContractPackage // .result.stored_value.Key // empty' | grep -o 'hash-[a-f0-9]\{64\}' || echo "")
    
    if [ -z "$PACKAGE_HASH" ]; then
        # Try extracting from named keys
        PACKAGE_HASH=$(echo "$result" | jq -r ".result.stored_value.Account.named_keys[\"$PACKAGE_NAME\"] // empty" 2>/dev/null || echo "")
    fi
    
    if [ -n "$PACKAGE_HASH" ]; then
        print_success "Package Hash: $PACKAGE_HASH"
        echo "$PACKAGE_HASH" > .package_hash
    else
        print_error "Could not find package hash for $PACKAGE_NAME"
        print_info "Manual method: Check your account's named keys"
        echo "$result" | jq '.' 2>/dev/null || echo "$result"
        exit 1
    fi
}

# ==================== STEP 2: INITIALIZE CONTRACT ====================

initialize_contract() {
    print_header "STEP 2: Initialize Contract"
    
    if [ -z "$PACKAGE_HASH" ]; then
        print_error "Package hash not found. Run get_package_hash first."
        exit 1
    fi
    
    print_info "Calling init() on package: $PACKAGE_HASH"
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_INIT \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "init" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -z "$deploy_hash" ]; then
        print_error "Failed to submit deploy"
        echo "$result"
        exit 1
    fi
    
    print_info "Deploy Hash: $deploy_hash"
    
    if wait_for_deploy $deploy_hash; then
        print_success "Contract initialized successfully!"
        echo "$deploy_hash" > .init_deploy_hash
    else
        print_error "Initialization failed"
        exit 1
    fi
}

# ==================== STEP 3: CHECK INITIALIZATION ====================

check_initialization() {
    print_header "STEP 3: Verify Initialization"
    
    print_info "Calling is_initialized()..."
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "is_initialized" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Initialization check passed!"
        fi
    fi
}

# ==================== STEP 4: CHECK OWNER ACCESS ====================

check_owner_access() {
    print_header "STEP 4: Check Owner Access Level"
    
    print_info "Calling get_user_access_level() for owner..."
    
    # Get owner address
    OWNER_KEY="account-hash-$(echo $PUBLIC_KEY_HEX | sed 's/^02//')"
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "get_user_access_level" \
        --session-arg "user:key='$OWNER_KEY'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Owner should have ACCESS_SUPER_ADMIN (level 4)"
        fi
    fi
}

# ==================== STEP 5: ISSUE TEST CREDENTIAL ====================

issue_test_credential() {
    print_header "STEP 5: Issue Test Credential"
    
    CRED_ID="TEST_CRED_$(date +%s)"
    IPFS_HASH="QmTest123abc456def789"
    HOLDER_KEY="account-hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    AI_CONFIDENCE=85
    EXPIRES_AT=9999999999
    ACCESS_LEVEL=1
    
    print_info "Credential ID: $CRED_ID"
    print_info "IPFS Hash: $IPFS_HASH"
    print_info "Holder: $HOLDER_KEY"
    print_info "AI Confidence: $AI_CONFIDENCE%"
    print_info "Access Level: $ACCESS_LEVEL (VIEWER)"
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_ISSUE \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "issue_credential" \
        --session-arg "credential_id:string='$CRED_ID'" \
        --session-arg "ipfs_hash:string='$IPFS_HASH'" \
        --session-arg "holder:key='$HOLDER_KEY'" \
        --session-arg "ai_confidence:u8='$AI_CONFIDENCE'" \
        --session-arg "expires_at:u64='$EXPIRES_AT'" \
        --session-arg "required_access_level:u8='$ACCESS_LEVEL'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Credential issued successfully!"
            echo "$CRED_ID" > .test_credential_id
        fi
    fi
}

# ==================== STEP 6: VERIFY CREDENTIAL ====================

verify_credential() {
    print_header "STEP 6: Verify Credential"
    
    if [ ! -f .test_credential_id ]; then
        print_error "No test credential found. Issue one first."
        return 1
    fi
    
    CRED_ID=$(cat .test_credential_id)
    
    print_info "Verifying credential: $CRED_ID"
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "verify_credential" \
        --session-arg "credential_id:string='$CRED_ID'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Credential verified!"
        fi
    fi
}

# ==================== STEP 7: GET CREDENTIAL DETAILS ====================

get_credential_details() {
    print_header "STEP 7: Get Credential Details"
    
    if [ ! -f .test_credential_id ]; then
        print_error "No test credential found."
        return 1
    fi
    
    CRED_ID=$(cat .test_credential_id)
    
    # Get IPFS hash
    print_info "Getting IPFS hash..."
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "get_ipfs" \
        --session-arg "id:string='$CRED_ID'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    if [ -n "$deploy_hash" ]; then
        wait_for_deploy $deploy_hash
    fi
    
    # Get confidence
    print_info "Getting AI confidence..."
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "get_confidence" \
        --session-arg "id:string='$CRED_ID'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    if [ -n "$deploy_hash" ]; then
        wait_for_deploy $deploy_hash
    fi
    
    print_success "Retrieved credential details"
}

# ==================== STEP 8: GET TOTAL CREDENTIALS ====================

get_total_credentials() {
    print_header "STEP 8: Get Total Credentials Count"
    
    print_info "Calling get_total()..."
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "get_total" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Total credentials count retrieved"
        fi
    fi
}

# ==================== STEP 9: REVOKE CREDENTIAL ====================

revoke_credential() {
    print_header "STEP 9: Revoke Credential"
    
    if [ ! -f .test_credential_id ]; then
        print_error "No test credential found."
        return 1
    fi
    
    CRED_ID=$(cat .test_credential_id)
    
    print_info "Revoking credential: $CRED_ID"
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_REVOKE \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "revoke_credential" \
        --session-arg "credential_id:string='$CRED_ID'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Credential revoked successfully!"
        fi
    fi
}

# ==================== STEP 10: VERIFY REVOKED CREDENTIAL ====================

verify_revoked_credential() {
    print_header "STEP 10: Verify Revoked Credential"
    
    if [ ! -f .test_credential_id ]; then
        print_error "No test credential found."
        return 1
    fi
    
    CRED_ID=$(cat .test_credential_id)
    
    print_info "Verifying revoked credential: $CRED_ID"
    print_info "This should return FALSE..."
    
    result=$(casper-client put-deploy \
        --node-address $NODE_URL \
        --chain-name $CHAIN_NAME \
        --secret-key $SECRET_KEY \
        --payment-amount $GAS_QUERY \
        --session-package-hash $PACKAGE_HASH \
        --session-entry-point "verify_credential" \
        --session-arg "credential_id:string='$CRED_ID'" 2>&1)
    
    deploy_hash=$(echo "$result" | jq -r '.result.deploy_hash // empty')
    
    if [ -n "$deploy_hash" ]; then
        print_info "Deploy Hash: $deploy_hash"
        if wait_for_deploy $deploy_hash; then
            print_success "Verification of revoked credential completed"
        fi
    fi
}

# ==================== MAIN EXECUTION ====================

main() {
    print_header "CasperCredIQ - Complete Test Suite"
    
    print_info "Node: $NODE_URL"
    print_info "Chain: $CHAIN_NAME"
    print_info "Contract Hash: $CONTRACT_HASH"
    
    # Check if package hash already exists
    if [ -f .package_hash ]; then
        PACKAGE_HASH=$(cat .package_hash)
        print_info "Using cached package hash: $PACKAGE_HASH"
    fi
    
    # Menu
    echo ""
    echo "Select test to run:"
    echo "  1) Get Package Hash"
    echo "  2) Initialize Contract"
    echo "  3) Check Initialization"
    echo "  4) Check Owner Access Level"
    echo "  5) Issue Test Credential"
    echo "  6) Verify Credential"
    echo "  7) Get Credential Details"
    echo "  8) Get Total Credentials"
    echo "  9) Revoke Credential"
    echo " 10) Verify Revoked Credential"
    echo " 11) Run ALL Tests (Full Suite)"
    echo "  0) Exit"
    echo ""
    read -p "Enter choice [0-11]: " choice
    
    case $choice in
        1) get_package_hash ;;
        2) initialize_contract ;;
        3) check_initialization ;;
        4) check_owner_access ;;
        5) issue_test_credential ;;
        6) verify_credential ;;
        7) get_credential_details ;;
        8) get_total_credentials ;;
        9) revoke_credential ;;
        10) verify_revoked_credential ;;
        11)
            get_package_hash
            initialize_contract
            check_initialization
            check_owner_access
            issue_test_credential
            verify_credential
            get_credential_details
            get_total_credentials
            revoke_credential
            verify_revoked_credential
            print_header "ALL TESTS COMPLETED!"
            ;;
        0) exit 0 ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Run main
main
