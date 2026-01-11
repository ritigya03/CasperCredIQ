#!/bin/bash

# Script to find the contract hash that contains your credentials
# The credentials are in dictionaries like dictionary-19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915

NODE_URL="http://65.109.83.79:7777/rpc"

# Known dictionary from your earlier output where TEST_VERIFY_01 data exists
KNOWN_DICT="dictionary-19ee565d2d48154a9241db492d694434b6fad89869b04b60ab518c01c1ed3915"

echo "🔍 Finding Contract Hash for Your Credentials"
echo "=============================================="
echo ""

# Get current state root
STATE_ROOT=$(casper-client get-state-root-hash --node-address $NODE_URL | jq -r '.result.state_root_hash')
echo "📡 State Root: $STATE_ROOT"
echo ""

# Query the known dictionary to find what contract it belongs to
echo "🔎 Querying dictionary: $KNOWN_DICT"
echo ""

casper-client query-global-state \
  --node-address $NODE_URL \
  --state-root-hash $STATE_ROOT \
  --key $KNOWN_DICT

echo ""
echo "💡 INSTRUCTIONS:"
echo "================"
echo "Look for the contract hash in the output above."
echo "The dictionary should reference a contract-hash or contract-package-hash."
echo ""
echo "If you see the contract hash, update your verify_credentials.js:"
echo "const CONTRACT_HASH = 'hash-XXXXX';"
echo ""
echo "Alternatively, check your deployment transaction to find the contract hash:"
echo "Look for the deploy hash when you first deployed the contract."