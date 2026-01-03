// utils/constants.ts - FIXED WITH YOUR CONTRACT HASH
export const CASPER_CONFIG = {
  NODE_URL: 'http://65.109.83.79:7777',
  CHAIN_NAME: 'casper-test',
  
  // ✅ CORRECT CONTRACT HASH (from your query output)
  CONTRACT_HASH: 'f03f54c7f281de1e867e7c13cbb796d26bc800f8aaf080c63323db87cfce33e9',
  
  // Package hash (for reference)
  PACKAGE_HASH: '73c2708ee69c1989183876a7a089e220db206f8820fb2e58c0b062d3370ab8fa',
  
  PAYMENT_AMOUNTS: {
    MINT: 5000000000, // 5 CSPR
  },
  
  NETWORK: {
    EXPLORER_URL: 'https://testnet.cspr.live',
  },
};

// Helper constants for easier usage
export const CONTRACT_HASH = `contract-${CASPER_CONFIG.CONTRACT_HASH}`;
export const CONTRACT_PACKAGE_HASH = `hash-${CASPER_CONFIG.PACKAGE_HASH}`;
export const CASPER_RPC_URL = CASPER_CONFIG.NODE_URL;