'use client';

import { CLPublicKey } from 'casper-js-sdk';
import { CASPER_CONFIG } from '../utils/constants';

// Get API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Submit a signed deploy via backend
 */
export async function submitSignedDeploy(signedDeployJson: any): Promise<string> {
  const res = await fetch(`${API_URL}/submit-deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploy: signedDeployJson }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Backend deploy failed');
  }

  const data = await res.json();
  return data.hash;
}

/**
 * Make JSON-RPC call through backend proxy (solves CORS)
 */
async function rpcCall(method: string, params: any = {}): Promise<any> {
  console.log('Making RPC call:', { method, params, apiUrl: API_URL });
  
  const response = await fetch(`${API_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });

  const data = await response.json();
  
  console.log('RPC response:', { method, data });
  console.log('RPC result structure:', {
    hasResult: !!data.result,
    hasError: !!data.error,
    errorMessage: data.error?.message,
    errorCode: data.error?.code,
    resultKeys: data.result ? Object.keys(data.result) : [],
    result: data.result
  });
  
  if (data.error) {
    console.error('RPC returned error:', data.error);
    throw new Error(data.error.message || 'RPC call failed');
  }
  
  return data.result;
}

/**
 * Casper Service - Read contract state via backend RPC proxy
 */
class CasperService {
  private contractHash: string;

  constructor() {
    // Note: We don't use CasperClient or CasperServiceByJsonRPC directly
    // Instead, we proxy all RPC calls through our backend to avoid CORS
    
    // Clean contract hash (remove 'hash-' prefix if present)
    this.contractHash = this.cleanContractHash(CASPER_CONFIG.CONTRACT_HASH);
    
    console.log('CasperService initialized (using backend RPC proxy):', {
      apiUrl: API_URL,
      originalContractHash: CASPER_CONFIG.CONTRACT_HASH,
      cleanedContractHash: this.contractHash,
      chainName: CASPER_CONFIG.CHAIN_NAME
    });
  }

  /**
   * Clean contract hash by removing prefixes
   */
  private cleanContractHash(hash: string): string {
    let cleaned = hash;
    if (cleaned.startsWith('hash-')) {
      cleaned = cleaned.slice(5);
    }
    if (cleaned.startsWith('contract-')) {
      cleaned = cleaned.slice(9);
    }
    return cleaned;
  }

  /**
   * Get contract's state root hash
   */
  async getStateRootHash(): Promise<string> {
    try {
      // Use chain_get_state_root_hash RPC method through our proxy
      const result = await rpcCall('chain_get_state_root_hash');
      
      // The result might be directly the hash or in state_root_hash field
      const stateRootHash = result.state_root_hash || result;
      
      if (!stateRootHash) {
        throw new Error('Failed to get state root hash from RPC response');
      }
      
      console.log('State root hash:', stateRootHash);
      return stateRootHash;
    } catch (error: any) {
      console.error('Error getting state root hash:', {
        message: error.message,
        apiUrl: API_URL
      });
      throw new Error(`Failed to get state root hash: ${error.message}`);
    }
  }

  /**
   * Query contract dictionary directly (Odra format)
   */
  async queryDictionary(dictionaryName: string, key: string): Promise<any> {
    try {
      const stateRootHash = await this.getStateRootHash();
      
      console.log('Querying dictionary:', {
        dictionaryName,
        key,
        contractHash: this.contractHash,
        stateRootHash
      });
      
      // First, get the contract to find the state URef
      const contractResult = await rpcCall('state_get_item', {
        state_root_hash: stateRootHash,
        key: `hash-${this.contractHash}`,
        path: []
      });
      
      console.log('Contract state:', {
        hasContract: !!contractResult,
        contractKeys: contractResult ? Object.keys(contractResult) : []
      });
      
      // Log the stored_value structure
      if (contractResult.stored_value) {
        console.log('stored_value keys:', Object.keys(contractResult.stored_value));
        if (contractResult.stored_value.Contract) {
          console.log('Contract keys:', Object.keys(contractResult.stored_value.Contract));
        }
      }
      
      // The contract is in stored_value.Contract
      const contract = contractResult.stored_value?.Contract || contractResult.Contract;
      
      if (!contract) {
        console.error('Contract not found in result:', contractResult);
        throw new Error('Contract not found');
      }
      
      console.log('Contract object keys:', Object.keys(contract));
      console.log('Has named_keys?', 'named_keys' in contract);
      
      const namedKeys = contract.named_keys || [];
      
      console.log('Named keys count:', namedKeys.length);
      console.log('All named keys:', namedKeys.map((nk: any) => ({ 
        name: nk.name, 
        keyType: nk.key.substring(0, 10) + '...' 
      })));
      
      if (namedKeys.length === 0) {
        console.error('No named keys found in contract');
        return null;
      }
      
      console.log('Looking for Odra state URef');
      
      // Odra stores all data under 'state' URef
      const stateEntry = namedKeys.find((nk: any) => nk.name === 'state');
      
      if (!stateEntry) {
        console.error('❌ State URef not found');
        console.log('Available named keys:', namedKeys.map((nk: any) => nk.name).join(', '));
        return null;
      }
      
      console.log('✅ Found Odra state URef:', stateEntry.key);
      
      // For Odra, we query using the state URef as seed_uref
      // The key should be: "credentials_" + account_hash
      const dictionaryItemKey = `${dictionaryName}_${key}`;
      
      console.log('Querying Odra dictionary:', {
        seedUref: stateEntry.key,
        dictionaryItemKey: dictionaryItemKey
      });
      
      // Query using Odra's dictionary format
      const result = await rpcCall('state_get_dictionary_item', {
        state_root_hash: stateRootHash,
        dictionary_identifier: {
          URef: {
            seed_uref: stateEntry.key,
            dictionary_item_key: dictionaryItemKey
          }
        }
      });
      
      console.log('Dictionary query result:', result);
      
      if (!result) {
        console.log('Result is null or undefined');
        return null;
      }
      
      console.log('Result keys:', Object.keys(result));
      
      // The result should have stored_value.CLValue structure
      if (result.stored_value && result.stored_value.CLValue) {
        console.log('Found stored_value.CLValue:', result.stored_value.CLValue);
        return result.stored_value;
      } else if (result.CLValue) {
        console.log('Found CLValue directly:', result.CLValue);
        return result;
      } else {
        console.log('No CLValue found in result:', result);
        return null;
      }
    } catch (error: any) {
      console.error('Error querying dictionary:', {
        dictionaryName,
        key,
        message: error.message
      });
      
      // Check if it's a "not found" error
      if (error.message?.includes('ValueNotFound') || 
          error.message?.includes('not found')) {
        // Return null for not found instead of throwing
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Get user's credential from contract
   */
  async getUserCredential(publicKeyHex: string): Promise<{
    role: string | null;
    isValid: boolean | any;
    isRevoked: boolean;
    issuedAt: Date | null;
    expiresAt: Date | null;
    issuer: string | null;
    exists: boolean;
  }> {
    try {
      const accountHash = this.getAccountHash(publicKeyHex);
      
      console.log('Getting user credential:', {
        publicKeyHex,
        accountHash
      });
      
      const result = await this.queryDictionary('credentials', accountHash);

      console.log('Credential query result:', {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : [],
        hasCLValue: !!(result && result.CLValue),
        fullResult: result
      });

      if (!result || !result.CLValue) {
        console.log('No credential found - returning empty');
        return {
          role: null,
          isValid: false,
          isRevoked: false,
          issuedAt: null,
          expiresAt: null,
          issuer: null,
          exists: false
        };
      }

      // Decode the credential bytes
      const bytes = result.CLValue.bytes;
      const credential = await this.decodeCredentialFromBytes(bytes);

      const now = Date.now();
      const isValid = !credential.revoked && credential.expiresAt && credential.expiresAt.getTime() > now;

      return {
        role: credential.role,
        isValid: isValid,
        isRevoked: credential.revoked,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        issuer: credential.issuer,
        exists: true
      };
    } catch (err: any) {
      console.error('Error getting user credential:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      
      // Return empty credential for not found
      if (err.code === -32003 || err.message?.includes('not found')) {
        return {
          role: null,
          isValid: false,
          isRevoked: false,
          issuedAt: null,
          expiresAt: null,
          issuer: null,
          exists: false
        };
      }
      
      throw err;
    }
  }

  /**
   * Decode credential bytes into structured data
   */
  private async decodeCredentialFromBytes(hexBytes: string): Promise<{
    role: string;
    issuedAt: Date | null;
    expiresAt: Date | null;
    revoked: boolean;
    issuer: string | null;
  }> {
    try {
      const data = Buffer.from(hexBytes, 'hex');
      
      console.log('Decoding credential bytes:', {
        hexBytes,
        byteLength: data.length
      });
      
      let offset = 0;
      
      // Decode role (length-prefixed string)
      const roleLen = data.readUInt32LE(offset);
      offset += 4;
      const role = data.slice(offset, offset + roleLen).toString('utf-8');
      offset += roleLen;
      
      // Decode issued_at (u64 timestamp in milliseconds)
      const issuedAtLow = data.readUInt32LE(offset);
      const issuedAtHigh = data.readUInt32LE(offset + 4);
      const issuedAtMs = issuedAtLow + (issuedAtHigh * 0x100000000);
      const issuedAt = new Date(issuedAtMs);
      offset += 8;
      
      // Decode expires_at (u64 timestamp in milliseconds)
      const expiresAtLow = data.readUInt32LE(offset);
      const expiresAtHigh = data.readUInt32LE(offset + 4);
      const expiresAtMs = expiresAtLow + (expiresAtHigh * 0x100000000);
      const expiresAt = new Date(expiresAtMs);
      offset += 8;
      
      // Decode revoked (bool)
      const revoked = data[offset] !== 0;
      offset += 1;
      
      // Decode issuer (33-byte Address - first byte is tag, next 32 bytes are account hash)
      const issuerTag = data[offset];
      offset += 1;
      const issuerHash = data.slice(offset, offset + 32);
      const issuer = 'account-hash-' + issuerHash.toString('hex');
      
      console.log('Decoded credential:', {
        role,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        revoked,
        issuer
      });
      
      return {
        role,
        issuedAt,
        expiresAt,
        revoked,
        issuer
      };
    } catch (error) {
      console.error('Error decoding credential bytes:', error);
      throw new Error('Failed to decode credential data');
    }
  }

  /**
   * Check if user's credential is valid (not expired and not revoked)
   */
  async isCredentialValid(publicKeyHex: string): Promise<boolean> {
    try {
      const credential = await this.getUserCredential(publicKeyHex);
      return credential.isValid;
    } catch (err: any) {
      console.error('Error checking validity:', err);
      return false;
    }
  }

  /**
   * Get user's role from contract
   */
  async getUserRole(publicKeyHex: string): Promise<string | null> {
    try {
      const credential = await this.getUserCredential(publicKeyHex);
      return credential.role;
    } catch (err: any) {
      console.error('Error reading role:', err);
      return null;
    }
  }

  /**
   * Convert public key to account hash format
   */
  private getAccountHash(publicKeyHex: string): string {
    try {
      let cleanKey = publicKeyHex;
      
      // Remove any existing prefixes
      if (cleanKey.startsWith('account-hash-')) {
        return cleanKey.replace('account-hash-', '');
      }
      
      // Remove algorithm prefix if present (01 or 02)
      if (cleanKey.startsWith('01') || cleanKey.startsWith('02')) {
        // Keep the prefix for CLPublicKey parsing
      }
      
      const pk = CLPublicKey.fromHex(publicKeyHex);
      const accountHash = pk.toAccountRawHashStr();
      
      console.log('Account hash conversion:', {
        input: publicKeyHex,
        cleanKey,
        accountHash
      });
      
      return accountHash;
    } catch (error) {
      console.error('Error converting to account hash:', error);
      throw new Error(`Failed to convert public key to account hash: ${publicKeyHex}`);
    }
  }

  /**
   * Get user's CSPR balance
   */
  async getBalance(publicKeyHex: string): Promise<bigint> {
    try {
      const stateRootHash = await this.getStateRootHash();
      const pk = CLPublicKey.fromHex(publicKeyHex);
      const balanceUref = pk.toAccountHashStr();
      
      // Use account_getAccountBalance RPC method
      const result = await rpcCall('state_get_balance', {
        state_root_hash: stateRootHash,
        purse_uref: balanceUref
      });
      
      const balance = BigInt(result.balance_value);
      console.log('Balance query:', { publicKeyHex, balance: balance.toString() });
      return balance;
    } catch (error: any) {
      console.error('Error getting balance:', error.message);
      return BigInt(0);
    }
  }

  /**
   * Test connection to backend RPC proxy
   */
  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      // Test by getting state root hash
      const stateRootHash = await this.getStateRootHash();
      console.log('Backend RPC proxy connection successful');
      
      return { 
        success: true, 
        version: stateRootHash.slice(0, 16) + '...'
      };
    } catch (error: any) {
      console.error('Backend RPC proxy connection failed:', error.message);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to backend RPC proxy' 
      };
    }
  }

  /**
   * Get deploy status
   */
  async getDeployStatus(deployHash: string): Promise<any> {
    try {
      const deployInfo = await rpcCall('info_get_deploy', {
        deploy_hash: deployHash
      });
      console.log('Deploy status:', { deployHash, deployInfo });
      return deployInfo;
    } catch (error: any) {
      console.error('Error getting deploy status:', error);
      throw error;
    }
  }

  /**
   * Check if an address is an authorized issuer
   */
  async isIssuer(publicKeyHex: string): Promise<boolean> {
    try {
      const accountHash = this.getAccountHash(publicKeyHex);
      
      console.log('Checking issuer status:', {
        publicKeyHex,
        accountHash
      });
      
      const result = await this.queryDictionary('issuers', accountHash);

      if (!result || !result.CLValue) {
        return false;
      }

      // Parse boolean value from the CLValue bytes
      const bytes = Buffer.from(result.CLValue.bytes, 'hex');
      return bytes[0] !== 0;
    } catch (err: any) {
      console.error('Error checking issuer status:', err);
      return false;
    }
  }

  /**
   * Get contract owner
   */
  async getOwner(): Promise<string | null> {
    try {
      const stateRootHash = await this.getStateRootHash();
      
      const result = await rpcCall('state_get_item', {
        state_root_hash: stateRootHash,
        key: `hash-${this.contractHash}`,
        path: ['owner']
      });

      console.log('Owner query result:', result);

      if (result && result.CLValue) {
        // Parse the owner address from bytes
        const bytes = Buffer.from(result.CLValue.bytes, 'hex');
        const ownerTag = bytes[0];
        const ownerHash = bytes.slice(1, 33);
        return 'account-hash-' + ownerHash.toString('hex');
      }

      return null;
    } catch (err: any) {
      console.error('Error getting owner:', err);
      return null;
    }
  }
}

export const casperService = new CasperService();