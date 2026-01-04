export const CASPER_CONFIG = {
  NODE_URL: 'http://65.109.83.79:7777',
  CHAIN_NAME: 'casper-test',
  
 
  CONTRACT_HASH: 'afd7ca51f8ab1d415b7abf2439074924bd486ad12f0babfdf539e891ef6c4a1a',
  
 
  PACKAGE_HASH: '8d40e74549c7f2e62b483e000009312a568bc1830e5090299ea55aa4f3317306',
  
 
  ACCESS_TOKEN: 'uref-7af0043890b07bf0104bc145ddb18c025875ae457d6d2ac3e8a27297b85d7f74-007',
  
  PAYMENT_AMOUNTS: {
    MINT: 5000000000,           // 5 CSPR - mint credential
    REVOKE: 3000000000,          // 3 CSPR - revoke credential
    ADD_ISSUER: 3000000000,      // 3 CSPR - add new issuer (NEW)
    REMOVE_ISSUER: 3000000000,   // 3 CSPR - remove issuer (NEW)
    TRANSFER_OWNERSHIP: 3000000000, // 3 CSPR - transfer ownership (NEW)
    
    GET_ROLE: 3000000000,        // 3 CSPR - get credential role
    GET_EXPIRY: 3000000000,      // 3 CSPR - get expiry timestamp
    IS_VALID: 3000000000,        // 3 CSPR - check if valid
    IS_REVOKED: 3000000000,      // 3 CSPR - check if revoked
    IS_ISSUER: 3000000000,       // 3 CSPR - check if address is issuer (NEW)
    GET_OWNER: 3000000000,       // 3 CSPR - get contract owner (NEW)
  },
  
  NETWORK: {
    EXPLORER_URL: 'https://testnet.cspr.live',
    ACCOUNT_URL: (accountHash: string) => 
      `https://testnet.cspr.live/account/${accountHash}`,
    DEPLOY_URL: (deployHash: string) => 
      `https://testnet.cspr.live/deploy/${deployHash}`,
  },
};

// Helper constants for easier usage
export const CONTRACT_HASH = `hash-${CASPER_CONFIG.CONTRACT_HASH}`;
export const CONTRACT_HASH_WITH_PREFIX = `contract-${CASPER_CONFIG.CONTRACT_HASH}`;
export const CONTRACT_PACKAGE_HASH = `hash-${CASPER_CONFIG.PACKAGE_HASH}`;
export const CASPER_RPC_URL = CASPER_CONFIG.NODE_URL;

// Entry point names (for reference)
export const ENTRY_POINTS = {
  // Write functions (issuer/owner only)
  MINT: 'mint',
  REVOKE: 'revoke',
  ADD_ISSUER: 'add_issuer',           // NEW - owner only
  REMOVE_ISSUER: 'remove_issuer',     // NEW - owner only
  TRANSFER_OWNERSHIP: 'transfer_ownership', // NEW - owner only
  
  // Read functions (anyone can call)
  IS_VALID: 'is_valid',
  IS_REVOKED: 'is_revoked',
  GET_ROLE: 'get_role',
  GET_EXPIRY: 'get_expiry',
  GET_OWNER: 'get_owner',             // NEW
  IS_ISSUER: 'is_issuer',             // NEW
} as const;

// Parameter names for contract calls
export const PARAM_NAMES = {
  USER: 'user',
  ADDRESS: 'address',
  ROLE: 'role',
  TTL_SECONDS: 'ttl_seconds',
  ISSUER: 'issuer',
  NEW_OWNER: 'new_owner',
} as const;

// ⚠️ IMPORTANT: TTL is now in MILLISECONDS, not seconds!
// The contract bug: expires_at = now + ttl_seconds (but now is in ms)
// Workaround: Pass milliseconds instead
export const TTL_PRESETS = {
  ONE_HOUR: 3600000,       // 1 hour = 3,600,000 ms
  ONE_DAY: 86400000,       // 1 day = 86,400,000 ms
  ONE_WEEK: 604800000,     // 1 week = 604,800,000 ms
  ONE_MONTH: 2592000000,   // 30 days = 2,592,000,000 ms
  ONE_YEAR: 31536000000,   // 365 days = 31,536,000,000 ms
} as const;

// Contract owner and deployer account
export const DEPLOYER_ACCOUNT = 'account-hash-7206cdf544f85aecaa8a156487c8d8598ec68841a3a1c75570753497aabc0d26';

// Type definitions for better TypeScript support
export type EntryPoint = typeof ENTRY_POINTS[keyof typeof ENTRY_POINTS];
export type ParamName = typeof PARAM_NAMES[keyof typeof PARAM_NAMES];

// Credential structure (matches on-chain format)
export interface Credential {
  role: string;
  issued_at: number;      // Unix timestamp in milliseconds
  expires_at: number;     // Unix timestamp in milliseconds
  revoked: boolean;
  issuer: string;         // Account hash of who issued it
}

// API response types
export interface MintResponse {
  deployHash: string;
  user: string;
  role: string;
  expiresAt: number;
}

export interface CredentialQueryResponse {
  exists: boolean;
  credential?: Credential;
  isValid?: boolean;
}