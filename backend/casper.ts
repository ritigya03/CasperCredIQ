// lib/casper.ts - Updated for casper-js-sdk v5+
'use client';

import { CasperClient, CLPublicKey, CLValueParsers, CasperServiceByJsonRPC, RuntimeArgs } from 'casper-js-sdk';
import { CASPER_CONFIG } from '@/utils/constants';

/**
 * Submit a signed deploy via backend
 */
export async function submitSignedDeploy(signedDeployJson: any): Promise<string> {
  const res = await fetch('http://localhost:3001/submit-deploy', {
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
 * Casper Service - Read contract state
 */
class CasperService {
  private client: CasperClient;
  private nodeClient: CasperServiceByJsonRPC;
  private contractHash: string;

  constructor() {
    // Initialize CasperClient with node URL
    this.client = new CasperClient(CASPER_CONFIG.NODE_URL);
    
    // Also initialize the low-level node client
    this.nodeClient = new CasperServiceByJsonRPC(CASPER_CONFIG.NODE_URL);
    
    // Clean contract hash (remove 'hash-' prefix if present)
    this.contractHash = this.cleanContractHash(CASPER_CONFIG.CONTRACT_HASH);
    
    console.log('CasperService initialized:', {
      nodeUrl: CASPER_CONFIG.NODE_URL,
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
   * Query contract entrypoint (read-only)
   */
  async queryContract(params: {
    contractHash?: string;
    entrypoint: string;
    args: RuntimeArgs;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const contractHash = params.contractHash 
        ? this.cleanContractHash(params.contractHash)
        : this.contractHash;

      console.log('Querying contract:', {
        contractHash,
        entrypoint: params.entrypoint,
        args: params.args
      });

      const stateRootHash = await this.nodeClient.getStateRootHash();
      
      // Note: For Odra contracts, we need to query the contract's named keys
      // to find the stored data. The contract stores data in dictionaries.
      
      // First, get the contract's state
      const contractData = await this.nodeClient.getBlockState(
        stateRootHash,
        `hash-${contractHash}`,
        []
      );

      console.log('Contract data:', contractData);

      // For get_role, we need to query the credentials mapping
      if (params.entrypoint === 'get_role') {
        // Extract user address from args
        const argsMap = params.args.toMap();
        const userArg = argsMap.get('user');
        
        if (!userArg) {
          throw new Error('User argument not provided');
        }

        // Convert the user CLByteArray to a key string
        const userBytes = userArg.bytes();
        const userKey = Buffer.from(userBytes).toString('hex');

        console.log('Querying role for user:', userKey);

        // Query the credentials dictionary
        try {
          const result = await this.nodeClient.getDictionaryItemByName(
            stateRootHash,
            contractHash,
            'credentials',
            userKey
          );

          console.log('Dictionary query result:', result);

          if (result && result.stored_value && result.stored_value.CLValue) {
            // Parse the credential struct
            const parsed = CLValueParsers.fromJSON(result.stored_value.CLValue);
            const credentialData = parsed.value();
            
            console.log('Parsed credential:', credentialData);

            // Extract role from credential
            if (credentialData && typeof credentialData === 'object') {
              // Handle different possible structures
              if ('role' in credentialData) {
                return { success: true, data: credentialData.role };
              } else if (Array.isArray(credentialData) && credentialData[0]) {
                // Sometimes returned as array [role, issued_at, expires_at, revoked]
                return { success: true, data: credentialData[0] };
              }
            }

            return { success: true, data: credentialData };
          }

          return { success: false, error: 'No credential found' };
        } catch (dictErr: any) {
          console.error('Dictionary query error:', dictErr);
          return { success: false, error: dictErr.message };
        }
      }

      // For other entrypoints, return the contract data
      return { success: true, data: contractData };

    } catch (err: any) {
      console.error('Contract query error:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      return { 
        success: false, 
        error: err.message || 'Failed to query contract' 
      };
    }
  }

  /**
   * Get user's role from contract
   */
  async getUserRole(userAddress: string): Promise<string | null> {
    try {
      const stateRootHash = await this.nodeClient.getStateRootHash();
      const accountHash = this.getAccountHash(userAddress);
      
      console.log('Querying user role:', {
        stateRootHash,
        contractHash: this.contractHash,
        accountHash,
        dictionaryName: 'credentials'
      });
      
      const result = await this.nodeClient.getDictionaryItemByName(
        stateRootHash,
        this.contractHash,
        'credentials',
        accountHash
      );

      console.log('Role query result:', result);

      if (result && result.stored_value && result.stored_value.CLValue) {
        try {
          const parsed = CLValueParsers.fromJSON(result.stored_value.CLValue);
          const credentialData = parsed.value();
          
          // Extract role from credential struct
          if (credentialData && typeof credentialData === 'object') {
            if ('role' in credentialData) {
              return credentialData.role;
            } else if (Array.isArray(credentialData) && credentialData[0]) {
              return credentialData[0];
            }
          }
          
          return credentialData?.toString() || null;
        } catch (parseErr) {
          console.error('Error parsing CLValue:', parseErr);
          
          if (result.stored_value.CLValue.parsed) {
            const parsed = result.stored_value.CLValue.parsed;
            if (typeof parsed === 'object' && 'role' in parsed) {
              return parsed.role;
            }
            return parsed.toString();
          }
        }
      }

      return null;
    } catch (err: any) {
      console.error('Error reading role:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      return null;
    }
  }

  /**
   * Check if user's credential is valid (not expired)
   */
  async isCredentialValid(userAddress: string): Promise<boolean> {
    try {
      const stateRootHash = await this.nodeClient.getStateRootHash();
      const accountHash = this.getAccountHash(userAddress);
      
      console.log('Querying credential validity:', {
        stateRootHash,
        contractHash: this.contractHash,
        accountHash
      });
      
      const result = await this.nodeClient.getDictionaryItemByName(
        stateRootHash,
        this.contractHash,
        'credentials',
        accountHash
      );

      console.log('Validity query result:', result);

      if (result && result.stored_value && result.stored_value.CLValue) {
        try {
          const parsed = CLValueParsers.fromJSON(result.stored_value.CLValue);
          const credentialData = parsed.value();
          
          // Extract expires_at and revoked from credential
          let expiresAt: number = 0;
          let revoked: boolean = false;
          
          if (credentialData && typeof credentialData === 'object') {
            if ('expires_at' in credentialData) {
              expiresAt = Number(credentialData.expires_at);
            }
            if ('revoked' in credentialData) {
              revoked = Boolean(credentialData.revoked);
            }
          } else if (Array.isArray(credentialData)) {
            // [role, issued_at, expires_at, revoked]
            expiresAt = Number(credentialData[2]);
            revoked = Boolean(credentialData[3]);
          }
          
          const now = Math.floor(Date.now() / 1000);
          
          console.log('Validity check:', {
            expiresAt,
            revoked,
            now,
            isValid: !revoked && expiresAt > now
          });
          
          return !revoked && expiresAt > now;
        } catch (parseErr) {
          console.error('Error parsing validity CLValue:', parseErr);
          return false;
        }
      }

      return false;
    } catch (err: any) {
      console.error('Error checking validity:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      return false;
    }
  }

  /**
   * Get user's credential details
   */
  async getUserCredential(userAddress: string): Promise<{
    role: string | null;
    isValid: boolean;
    expiryDate: Date | null;
  }> {
    try {
      const stateRootHash = await this.nodeClient.getStateRootHash();
      const accountHash = this.getAccountHash(userAddress);
      
      const result = await this.nodeClient.getDictionaryItemByName(
        stateRootHash,
        this.contractHash,
        'credentials',
        accountHash
      );

      if (result && result.stored_value && result.stored_value.CLValue) {
        try {
          const parsed = CLValueParsers.fromJSON(result.stored_value.CLValue);
          const credentialData = parsed.value();
          
          let role: string | null = null;
          let expiresAt: number = 0;
          let revoked: boolean = false;
          
          if (credentialData && typeof credentialData === 'object') {
            if ('role' in credentialData) role = credentialData.role;
            if ('expires_at' in credentialData) expiresAt = Number(credentialData.expires_at);
            if ('revoked' in credentialData) revoked = Boolean(credentialData.revoked);
          } else if (Array.isArray(credentialData)) {
            role = credentialData[0];
            expiresAt = Number(credentialData[2]);
            revoked = Boolean(credentialData[3]);
          }
          
          const now = Math.floor(Date.now() / 1000);
          const isValid = !revoked && expiresAt > now;
          const expiryDate = expiresAt ? new Date(expiresAt * 1000) : null;

          console.log('User credential result:', {
            userAddress,
            role,
            isValid,
            expiryDate
          });

          return { role, isValid, expiryDate };
        } catch (parseErr) {
          console.error('Error parsing credential:', parseErr);
        }
      }

      return { role: null, isValid: false, expiryDate: null };
    } catch (err: any) {
      console.error('Error getting credential:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      return { role: null, isValid: false, expiryDate: null };
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
      
      if (cleanKey.startsWith('01')) {
        cleanKey = cleanKey.slice(2);
      }
      
      if (cleanKey.startsWith('02')) {
        cleanKey = cleanKey.slice(2);
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
      return publicKeyHex;
    }
  }

  /**
   * Get user's CSPR balance
   */
  async getBalance(publicKeyHex: string): Promise<bigint> {
    try {
      const pk = CLPublicKey.fromHex(publicKeyHex);
      const balance = await this.nodeClient.getAccountBalance(pk);
      console.log('Balance query:', { publicKeyHex, balance: balance.toString() });
      return balance;
    } catch (error: any) {
      console.error('Error getting balance:', {
        message: error.message,
        code: error.code,
        data: error.data
      });
      return BigInt(0);
    }
  }

  /**
   * Get contract's state root hash
   */
  async getStateRootHash(): Promise<string> {
    try {
      const hash = await this.nodeClient.getStateRootHash();
      console.log('State root hash:', hash);
      return hash;
    } catch (error: any) {
      console.error('Error getting state root hash:', {
        message: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Query contract dictionary directly
   */
  async queryDictionary(dictionaryName: string, key: string): Promise<any> {
    try {
      const stateRootHash = await this.getStateRootHash();
      const result = await this.nodeClient.getDictionaryItemByName(
        stateRootHash,
        this.contractHash,
        dictionaryName,
        key
      );
      console.log('Dictionary query result:', { dictionaryName, key, result });
      return result;
    } catch (error: any) {
      console.error('Error querying dictionary:', {
        dictionaryName,
        key,
        message: error.message,
        code: error.code,
        data: error.data
      });
      throw error;
    }
  }

  /**
   * Test connection to node
   */
  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const status = await this.nodeClient.getNodeStatus();
      console.log('Node connection successful:', status);
      return { success: true, version: status.api_version };
    } catch (error: any) {
      console.error('Node connection failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to node' 
      };
    }
  }

  /**
   * Get deploy status
   */
  async getDeployStatus(deployHash: string): Promise<any> {
    try {
      const deploy = await this.nodeClient.getDeploy(deployHash);
      console.log('Deploy status:', { deployHash, deploy });
      return deploy;
    } catch (error: any) {
      console.error('Error getting deploy status:', error);
      throw error;
    }
  }
}

export const casperService = new CasperService();