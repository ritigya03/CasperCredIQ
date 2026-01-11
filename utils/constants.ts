export const CASPER_CONFIG = {
  NODE_URL: 'http://65.109.83.79:7777',
  CHAIN_NAME: 'casper-test',
  
  // CasperCredIQ MVP Contract
  CONTRACT_HASH: '971986539f375a9c7da1879177f11c5fa8b0a28f50ae61e93480a3522ce347c7',
  PACKAGE_HASH: '32f170fbb5a6410270a1fe0d89bcb060d9f8291a4a70a9d3dda3159f21565a35',
  
  PAYMENT_AMOUNTS: {
    ISSUE_CREDENTIAL: 5000000000,      // 5 CSPR
    REVOKE_CREDENTIAL: 3000000000,     // 3 CSPR
    SET_ACCESS_LEVEL: 3000000000,      // 3 CSPR
    QUERY: 3000000000,                 // 3 CSPR - for any read operation
  },
  
  NETWORK: {
    EXPLORER_URL: 'https://testnet.cspr.live',
    DEPLOY_URL: (deployHash: string) => `https://testnet.cspr.live/deploy/${deployHash}`,
  },
};

// Helper constants
export const CONTRACT_HASH = `hash-${CASPER_CONFIG.CONTRACT_HASH}`;
export const CONTRACT_HASH_PREFIXED = `contract-${CASPER_CONFIG.CONTRACT_HASH}`;
export const PACKAGE_HASH = `hash-${CASPER_CONFIG.PACKAGE_HASH}`;

// Entry points
export const ENTRY_POINTS = {
  ISSUE_CREDENTIAL: 'issue_credential',
  REVOKE_CREDENTIAL: 'revoke_credential',
  SET_ACCESS_LEVEL: 'set_access_level',
  VERIFY_CREDENTIAL: 'verify_credential',
  GET_HOLDER: 'get_holder',
  GET_ISSUER: 'get_issuer',
  GET_CONFIDENCE: 'get_confidence',
  GET_IPFS_HASH: 'get_ipfs_hash',
  GET_EXPIRY: 'get_expiry',
  IS_REVOKED: 'is_revoked',
  GET_OWNER: 'get_owner',
  GET_ACCESS_LEVEL: 'get_access_level',
} as const;

// Access levels
export const ACCESS_LEVELS = {
  NO_ACCESS: 0,
  VIEWER: 1,
  ISSUER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
} as const;

// Time presets (in days)
export const EXPIRY_DAYS = {
  ONE_WEEK: 7,
  ONE_MONTH: 30,
  SIX_MONTHS: 180,
  ONE_YEAR: 365,
} as const;

// Types
export interface Credential {
  credential_id: string;
  holder: string;
  issuer: string;
  ai_confidence: number;
  ipfs_hash: string;
  expires_at: number;
  revoked: boolean;
}