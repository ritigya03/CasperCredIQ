echo "=== Creating new credential TEST001 ==="

# Get your account hash (from your public key)
PUBLIC_KEY_HEX=$(cat /home/ritigya_g/caspercred_final/keys/public_key.pem | sed -n '2,6p' | tr -d '\n' | base64 -d | xxd -p -c 64)
ACCOUNT_HASH="account-hash-$PUBLIC_KEY_HEX"

echo "Your account hash: $ACCOUNT_HASH"

# First, ensure you have access level 2
casper-client put-deploy \
  --node-address http://65.109.83.79:7777/rpc \
  --chain-name casper-test \
  --secret-key /home/ritigya_g/caspercred_final/keys/secret_key.pem \
  --payment-amount 30000000000 \
  --session-package-hash hash-32f170fbb5a6410270a1fe0d89bcb060d9f8291a4a70a9d3dda3159f21565a35 \
  --session-entry-point "set_access_level" \
  --session-arg "user:key='$ACCOUNT_HASH'" \
  --session-arg "level:u8='2'"