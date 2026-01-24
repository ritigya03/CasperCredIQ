export const CASPER_CONFIG = {
  NODE_URL: 'http://65.109.83.79:7777',
  CHAIN_NAME: 'casper-test',
  
  // CasperCredIQ Contract (Updated with your actual deployment hashes)
  CONTRACT_HASH: '7375d3d1d28854233133b882cd2ea15596ab8ab6c15277fa569c3c245f30cdcd',
  PACKAGE_HASH: '6bb3dcbde7218c1471a0387e2f20a1db55b7d98df3b27ce32e342c0bd12357e8',
  
  PAYMENT_AMOUNTS: {
    // Deployment and initialization
    DEPLOY_CONTRACT: 500000000000,           // 500 CSPR
    INIT_CONTRACT: 100000000,                // 0.1 CSPR
    
    // Write operations
    ISSUE_CREDENTIAL: 8000000000,           // 8 CSPR
    REVOKE_CREDENTIAL: 4000000000,          // 4 CSPR
    VERIFY_CRYPTOGRAPHIC: 5000000000,       // 5 CSPR
    SET_ACCESS_LEVEL: 3000000000,           // 3 CSPR
    PAUSE_CONTRACT: 3000000000,             // 3 CSPR
    UNPAUSE_CONTRACT: 3000000000,           // 3 CSPR
    TRANSFER_OWNERSHIP: 3000000000,         // 3 CSPR
    
    // Read operations (queries)
    QUERY: 3000000000,                      // 3 CSPR
  },
  
  NETWORK: {
    EXPLORER_URL: 'https://testnet.cspr.live',
    DEPLOY_URL: (deployHash: string) => `https://testnet.cspr.live/deploy/${deployHash}`,
    ACCOUNT_URL: (accountHash: string) => `https://testnet.cspr.live/account/${accountHash}`,
    CONTRACT_URL: (contractHash: string) => `https://testnet.cspr.live/contract-package/${contractHash}`,
  },
};

// Helper constants - PREFIXED VERSIONS
export const CONTRACT_PACKAGE_HASH = `hash-${CASPER_CONFIG.PACKAGE_HASH}`;
export const CONTRACT_HASH_PREFIXED = `contract-${CASPER_CONFIG.CONTRACT_HASH}`;
export const PACKAGE_HASH_PREFIXED = `hash-${CASPER_CONFIG.PACKAGE_HASH}`;

// Named keys on your account (as seen in the deploy output)
export const NAMED_KEYS = {
  CASPERCRED_IQ: 'caspercred_iq',
  CASPERCRED_IQ_ACCESS_TOKEN: 'caspercred_iq_access_token',
};

// Entry points (from your contract)
export const ENTRY_POINTS = {
  // Initialization
  INIT: 'init',
  
  // Write operations
  ISSUE_CREDENTIAL: 'issue_credential',
  REVOKE_CREDENTIAL: 'revoke_credential',
  VERIFY_CREDENTIAL: 'verify_credential',                       // Simple verification
  VERIFY_CREDENTIAL_CRYPTOGRAPHIC: 'verify_credential_cryptographic',  // With audit log
  SET_ACCESS_LEVEL: 'set_access_level',
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  TRANSFER_OWNERSHIP: 'transfer_ownership',
  
  // Read operations (View functions)
  GET_CREDENTIAL: 'get_credential',
  IS_REVOKED: 'is_revoked',
  
  // Holder/Issuer index functions
  GET_HOLDER_CREDENTIAL_COUNT: 'get_holder_credential_count',
  GET_HOLDER_CREDENTIAL_AT_INDEX: 'get_holder_credential_at_index',
  GET_ISSUER_CREDENTIAL_COUNT: 'get_issuer_credential_count',
  GET_ISSUER_CREDENTIAL_AT_INDEX: 'get_issuer_credential_at_index',
  
  // Audit log functions
  GET_AUDIT_COUNT: 'get_audit_count',
  GET_AUDIT_LOG_AT_INDEX: 'get_audit_log_at_index',
  
  // General getters
  GET_SUSPICIOUS_ACTIVITY_COUNT: 'get_suspicious_activity_count',
  GET_VERIFICATION_COUNT: 'get_verification_count',
  GET_OWNER: 'get_owner',
  GET_ACCESS_LEVEL: 'get_access_level',
  IS_PAUSED: 'is_paused',
  GET_TOTAL_CREDENTIALS: 'get_total_credentials',
} as const;

// Access levels (Zero Trust Architecture)
export const ACCESS_LEVELS = {
  NO_ACCESS: 0,      // No permissions
  VIEWER: 1,         // Can view public data only
  ISSUER: 2,         // Can issue credentials
  AUDITOR: 3,        // Can view all credentials for audit purposes
  OWNER: 4,          // Full admin access (super admin)
} as const;

export const ACCESS_LEVEL_NAMES = {
  0: 'No Access',
  1: 'Viewer',
  2: 'Issuer',
  3: 'Auditor',
  4: 'Owner',
} as const;

// Time presets (in days)
export const EXPIRY_DAYS = {
  ONE_DAY: 1,
  ONE_WEEK: 7,
  TWO_WEEKS: 14,
  ONE_MONTH: 30,
  THREE_MONTHS: 90,
  SIX_MONTHS: 180,
  ONE_YEAR: 365,
  TWO_YEARS: 730,
  FIVE_YEARS: 1825,
} as const;

// Rate limiting constants (from your contract)
export const RATE_LIMITS = {
  MAX_CREDENTIALS_PER_HOUR: 25,
  MAX_VERIFICATIONS_PER_HOUR: 50,
  RATE_WINDOW_MS: 3600000, // 1 hour in milliseconds
  BLOCK_TIME_HOURS: 1,     // Block for 1 hour if rate limit exceeded
} as const;

// Validation constants (from your contract)
export const VALIDATION = {
  CREDENTIAL_HASH_LENGTH: 64,      // SHA-256 hash (hex) - 64 chars
  MIN_SIGNATURE_LENGTH: 64,        // Minimum signature length
  MIN_IPFS_HASH_LENGTH: 10,
  DID_PREFIX: 'did:',
  MIN_DID_LENGTH: 10,
  MAX_AI_CONFIDENCE: 100,
  MAX_U256: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // U256 max
} as const;

// Event names (from your contract events)
export const EVENTS = {
  CREDENTIAL_ISSUED: 'CredentialIssued',
  CREDENTIAL_REVOKED: 'CredentialRevoked',
  CREDENTIAL_VERIFIED: 'CredentialVerified',
  ACCESS_LEVEL_CHANGED: 'AccessLevelChanged',
  SUSPICIOUS_ACTIVITY: 'SuspiciousActivity',
  OWNERSHIP_TRANSFERRED: 'OwnershipTransferred',
  CONTRACT_PAUSED: 'ContractPaused',
  CONTRACT_UNPAUSED: 'ContractUnpaused',
  AUDIT_LOG_CREATED: 'AuditLogCreated',
} as const;

// Audit log action types
export const AUDIT_ACTIONS = {
  ISSUED: 'ISSUED',
  REVOKED: 'REVOKED',
  VERIFIED: 'VERIFIED',
} as const;

// Error codes (matching your contract errors)
export const ERROR_CODES = {
  NOT_OWNER: 0,
  NOT_AUTHORIZED: 1,
  CREDENTIAL_NOT_FOUND: 2,
  ALREADY_EXISTS: 3,
  INVALID_INPUT: 4,
  INVALID_SIGNATURE: 5,
  HASH_MISMATCH: 6,
  RATE_LIMIT_EXCEEDED: 7,
  EXPIRED_CREDENTIAL: 8,
  REVOKED_CREDENTIAL: 9,
  CONTRACT_PAUSED: 10,
  INVALID_DID: 11,
} as const;

// U256 helper
export const U256_ZERO = '0';

// Types

/**
 * W3C Verifiable Credential (on-chain version)
 */
export interface VerifiableCredential {
  issuer_did: string;
  issuer_address: string;
  holder_did: string;
  holder_address: string;
  credential_hash: string;
  issuer_signature: string;
  issued_at: number;
  expires_at: number;
  ai_confidence: number;
  ipfs_hash: string;
  revoked: boolean;
}

/**
 * Audit Log Entry
 */
export interface AuditLog {
  action: string;
  actor: string;
  timestamp: number;
  details: string;
}

/**
 * Simplified credential info for UI display
 */
export interface CredentialInfo {
  credential_id: string;
  issuer_did: string;
  issuer_address: string;
  holder_did: string;
  holder_address: string;
  ai_confidence: number;
  ipfs_hash: string;
  issued_at: number;
  expires_at: number;
  revoked: boolean;
  is_expired: boolean;
}

/**
 * Issue credential parameters
 */
export interface IssueCredentialParams {
  issuer_did: string;
  holder_did: string;
  holder_address: string;
  credential_hash: string;
  issuer_signature: string;
  ipfs_hash: string;
  ai_confidence: number;
  expires_in_days: number;
}

/**
 * Verify credential parameters (cryptographic)
 */
export interface VerifyCredentialCryptographicParams {
  credential_id: string;
  provided_hash: string;
  verification_type: string;
}

/**
 * Event data structures
 */
export interface CredentialIssuedEvent {
  credential_id: string;
  holder: string;
  issuer: string;
  issuer_did: string;
  holder_did: string;
  ai_confidence: number;
  credential_hash: string;
  ipfs_hash: string;
  timestamp: number;
}

export interface CredentialRevokedEvent {
  credential_id: string;
  revoked_by: string;
  reason: string;
  timestamp: number;
  was_already_revoked: boolean;
}

export interface CredentialVerifiedEvent {
  credential_id: string;
  verifier: string;
  is_valid: boolean;
  verification_type: string;
  timestamp: number;
}

export interface AuditLogCreatedEvent {
  credential_id: string;
  action: string;
  actor: string;
  timestamp: number;
  audit_count: number;
}

/**
 * User/Account info
 */
export interface UserInfo {
  address: string;
  access_level: number;
  access_level_name: string;
  holder_credential_count: number;
  issuer_credential_count: number;
  suspicious_activity_count: number;
  verification_count: number;
}

/**
 * Contract state
 */
export interface ContractState {
  owner: string;
  is_paused: boolean;
  total_credentials: string;
}

// Helper functions

/**
 * Convert U256 to string
 */
export const u256ToString = (u256: any): string => {
  if (typeof u256 === 'object' && u256.value) {
    return u256.value.toString();
  }
  return u256.toString();
};

/**
 * Format timestamp to readable date
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Check if credential is expired
 */
export const isExpired = (expiresAt: number): boolean => {
  return Date.now() >= expiresAt;
};

/**
 * Calculate days until expiry
 */
export const daysUntilExpiry = (expiresAt: number): number => {
  const now = Date.now();
  const diff = expiresAt - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Validate DID format
 */
export const isValidDID = (did: string): boolean => {
  return did.startsWith(VALIDATION.DID_PREFIX) && did.length >= VALIDATION.MIN_DID_LENGTH;
};

/**
 * Validate credential hash
 */
export const isValidCredentialHash = (hash: string): boolean => {
  return hash.length === VALIDATION.CREDENTIAL_HASH_LENGTH && /^[a-fA-F0-9]+$/.test(hash);
};

/**
 * Validate AI confidence score
 */
export const isValidAIConfidence = (confidence: number): boolean => {
  return confidence >= 0 && confidence <= VALIDATION.MAX_AI_CONFIDENCE;
};

/**
 * Get access level name
 */
export const getAccessLevelName = (level: number): string => {
  return ACCESS_LEVEL_NAMES[level as keyof typeof ACCESS_LEVEL_NAMES] || 'Unknown';
};

/**
 * Format account hash for display
 */
export const formatAccountHash = (hash: string, short: boolean = true): string => {
  if (short && hash.length > 20) {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  }
  return hash;
};

/**
 * Parse error from contract
 */
export const parseContractError = (errorCode: number): string => {
  const errorMessages: { [key: number]: string } = {
    [ERROR_CODES.NOT_OWNER]: 'Only the contract owner can perform this action',
    [ERROR_CODES.NOT_AUTHORIZED]: 'You are not authorized to perform this action',
    [ERROR_CODES.CREDENTIAL_NOT_FOUND]: 'Credential not found',
    [ERROR_CODES.ALREADY_EXISTS]: 'Credential already exists',
    [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
    [ERROR_CODES.INVALID_SIGNATURE]: 'Invalid signature (minimum 64 characters)',
    [ERROR_CODES.HASH_MISMATCH]: 'Credential hash mismatch',
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded - maximum 25 credentials per hour',
    [ERROR_CODES.EXPIRED_CREDENTIAL]: 'Credential has expired',
    [ERROR_CODES.REVOKED_CREDENTIAL]: 'Credential has been revoked',
    [ERROR_CODES.CONTRACT_PAUSED]: 'Contract is currently paused',
    [ERROR_CODES.INVALID_DID]: `Invalid DID format. Must start with "${VALIDATION.DID_PREFIX}" and be at least ${VALIDATION.MIN_DID_LENGTH} characters`,
  };
  
  return errorMessages[errorCode] || `Unknown error (code: ${errorCode})`;
};

/**
 * Generate mock credential hash for testing
 */
export const generateMockCredentialHash = (): string => {
  return Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/**
 * Generate mock signature for testing
 */
export const generateMockSignature = (): string => {
  return Array.from({length: 128}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

/**
 * Get explorer URL for deploy
 */
export const getDeployExplorerUrl = (deployHash: string): string => {
  return `${CASPER_CONFIG.NETWORK.EXPLORER_URL}/deploy/${deployHash}`;
};

export default CASPER_CONFIG;