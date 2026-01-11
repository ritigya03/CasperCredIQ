#![cfg_attr(not(test), no_std)]

extern crate alloc;

use alloc::string::String;
// Removed unused Vec import

use odra::prelude::*;

// ================ EVENTS ================

#[odra::event]
pub struct CredentialIssued {
    pub credential_id: String,
    pub holder: Address,
    pub issuer: Address,
    pub ai_confidence: u8,
}

#[odra::event]
pub struct CredentialRevoked {
    pub credential_id: String,
    pub revoked_by: Address,
}

// ================ ERRORS ================

#[odra::odra_error]
pub enum Error {
    NotOwner = 0,
    NotAuthorized = 1,
    CredentialNotFound = 2,
    AlreadyExists = 3,
    InvalidInput = 4,
}

// ================ MAIN CONTRACT ================

#[odra::module]
pub struct CasperCredIQ {
    // Contract owner
    owner: Var<Address>,
    
    // credential_id -> holder address
    cred_holder: Mapping<String, Address>,
    
    // credential_id -> issuer address  
    cred_issuer: Mapping<String, Address>,
    
    // credential_id -> AI confidence score (0-100)
    cred_confidence: Mapping<String, u8>,
    
    // credential_id -> expiry timestamp
    cred_expires: Mapping<String, u64>,
    
    // credential_id -> revoked status
    cred_revoked: Mapping<String, bool>,
    
    // credential_id -> IPFS hash
    cred_ipfs: Mapping<String, String>,
    
    // address -> access level (0-4)
    access_level: Mapping<Address, u8>,
}

#[odra::module]
impl CasperCredIQ {
    /// Initialize contract - deployer becomes owner
    pub fn init(&mut self) {
        let deployer = self.env().caller();
        self.owner.set(deployer);
        // Owner gets level 4 (super admin)
        self.access_level.set(&deployer, 4);
    }

    // ================ OWNER FUNCTIONS ================

    /// Set access level for an address (owner only)
    pub fn set_access_level(&mut self, user: Address, level: u8) {
        // Only owner can set access levels
        if self.env().caller() != self.owner.get().unwrap() {
            self.env().revert(Error::NotOwner);
        }
        
        // Level must be 0-4
        if level > 4 {
            self.env().revert(Error::InvalidInput);
        }
        
        self.access_level.set(&user, level);
    }

    // ================ CREDENTIAL FUNCTIONS ================

    /// Issue a new credential (requires level 2+)
    pub fn issue_credential(
        &mut self,
        credential_id: String,
        holder: Address,
        ipfs_hash: String,
        ai_confidence: u8,
        expires_in_days: u64,
    ) {
        let caller = self.env().caller();
        
        // Check caller has at least issuer level (2)
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        if caller_level < 2 && caller != self.owner.get().unwrap() {
            self.env().revert(Error::NotAuthorized);
        }
        
        // Validate AI confidence
        if ai_confidence > 100 {
            self.env().revert(Error::InvalidInput);
        }
        
        // Validate IPFS hash
        if ipfs_hash.len() < 10 {
            self.env().revert(Error::InvalidInput);
        }
        
        // Check if credential ID already exists
        if self.cred_holder.get(&credential_id).is_some() {
            self.env().revert(Error::AlreadyExists);
        }
        
        // Calculate expiry timestamp
        let current_time = self.env().get_block_time();
        let expires_at = current_time + (expires_in_days * 24 * 60 * 60 * 1000);
        
        // Store credential data
        self.cred_holder.set(&credential_id, holder);
        self.cred_issuer.set(&credential_id, caller);
        self.cred_confidence.set(&credential_id, ai_confidence);
        self.cred_expires.set(&credential_id, expires_at);
        self.cred_revoked.set(&credential_id, false);
        self.cred_ipfs.set(&credential_id, ipfs_hash);
        
        self.env().emit_event(CredentialIssued {
            credential_id,
            holder,
            issuer: caller,
            ai_confidence,
        });
    }

    /// Revoke a credential (issuer or owner only)
    pub fn revoke_credential(&mut self, credential_id: String) {
        let caller = self.env().caller();
        
        // Get credential issuer
        let issuer = match self.cred_issuer.get(&credential_id) {
            Some(i) => i,
            None => self.env().revert(Error::CredentialNotFound),
        };
        
        let owner = self.owner.get().unwrap();
        
        // Check permissions: issuer or owner can revoke
        if caller != issuer && caller != owner {
            self.env().revert(Error::NotAuthorized);
        }
        
        // Mark as revoked
        self.cred_revoked.set(&credential_id, true);
        
        self.env().emit_event(CredentialRevoked {
            credential_id,
            revoked_by: caller,
        });
    }

    // ================ VIEW FUNCTIONS ================

    /// Verify if credential is valid (public)
    pub fn verify_credential(&self, credential_id: String) -> bool {
        // Check if exists
        if self.cred_holder.get(&credential_id).is_none() {
            return false;
        }
        
        // Check if revoked
        if self.cred_revoked.get(&credential_id).unwrap_or(false) {
            return false;
        }
        
        // Check if expired
        let expires_at = match self.cred_expires.get(&credential_id) {
            Some(e) => e,
            None => return false,
        };
        
        let current_time = self.env().get_block_time();
        current_time < expires_at
    }

    /// Get credential holder (public)
    pub fn get_holder(&self, credential_id: String) -> Option<Address> {
        self.cred_holder.get(&credential_id)
    }

    /// Get credential issuer (public)
    pub fn get_issuer(&self, credential_id: String) -> Option<Address> {
        self.cred_issuer.get(&credential_id)
    }

    /// Get AI confidence score (with access control)
    pub fn get_confidence(&self, credential_id: String) -> Option<u8> {
        // Check if caller has permission
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        self.cred_confidence.get(&credential_id)
    }

    /// Get IPFS hash (with access control)
    pub fn get_ipfs_hash(&self, credential_id: String) -> Option<String> {
        // Check if caller has permission
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        self.cred_ipfs.get(&credential_id)
    }

    /// Get expiry timestamp (with access control)
    pub fn get_expiry(&self, credential_id: String) -> Option<u64> {
        // Check if caller has permission
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        self.cred_expires.get(&credential_id)
    }

    /// Check if credential is revoked (with access control)
    pub fn is_revoked(&self, credential_id: String) -> Option<bool> {
        // Check if caller has permission
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        Some(self.cred_revoked.get(&credential_id).unwrap_or(false))
    }

    /// Get contract owner
    pub fn get_owner(&self) -> Address {
        self.owner.get().unwrap()
    }

    /// Get access level for an address
    pub fn get_access_level(&self, address: Address) -> u8 {
        self.access_level.get(&address).unwrap_or(0)
    }

    // ================ INTERNAL HELPERS ================

    /// Check if caller can view credential details
    fn can_view_credential(&self, credential_id: &String) -> bool {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        // Owner can view everything
        if caller == owner {
            return true;
        }
        
        // Get credential holder
        let holder = match self.cred_holder.get(credential_id) {
            Some(h) => h,
            None => return false,
        };
        
        // Holder can view their own credentials
        if caller == holder {
            return true;
        }
        
        // Get credential issuer
        let issuer = match self.cred_issuer.get(credential_id) {
            Some(i) => i,
            None => return false,
        };
        
        // Issuer can view credentials they issued
        if caller == issuer {
            return true;
        }
        
        // Check access level
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        caller_level >= 1 // Level 1 (viewer) or higher
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_deploy() {
        let env = odra_test::env();
        let deployer = env.get_account(0);
        
        env.set_caller(deployer);
        let contract = CasperCredIQ::deploy(&env, NoArgs);
        
        assert_eq!(contract.get_owner(), deployer);
        assert_eq!(contract.get_access_level(deployer), 4);
    }

    #[test]
    fn test_issue_credential() {
        let env = odra_test::env();
        let deployer = env.get_account(0);
        let employee = env.get_account(1);
        
        env.set_caller(deployer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Issue credential
        contract.issue_credential(
            "EMP001".to_string(),
            employee,
            "QmTestHash1234567890".to_string(),
            87,
            365, // 1 year
        );
        
        // Verify credential
        assert!(contract.verify_credential("EMP001".to_string()));
        
        // Check holder
        assert_eq!(contract.get_holder("EMP001".to_string()), Some(employee));
        
        // Check issuer
        assert_eq!(contract.get_issuer("EMP001".to_string()), Some(deployer));
        
        // Owner can view AI confidence
        env.set_caller(deployer);
        assert_eq!(contract.get_confidence("EMP001".to_string()), Some(87));
        
        // Employee can view their own credential
        env.set_caller(employee);
        assert_eq!(contract.get_confidence("EMP001".to_string()), Some(87));
    }

    #[test]
    fn test_revoke_credential() {
        let env = odra_test::env();
        let deployer = env.get_account(0);
        let employee = env.get_account(1);
        
        env.set_caller(deployer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        contract.issue_credential(
            "EMP002".to_string(),
            employee,
            "QmTestHash9876543210".to_string(),
            92,
            365,
        );
        
        assert!(contract.verify_credential("EMP002".to_string()));
        
        // Revoke
        contract.revoke_credential("EMP002".to_string());
        
        assert!(!contract.verify_credential("EMP002".to_string()));
        
        // Check revoked status
        env.set_caller(deployer);
        assert_eq!(contract.is_revoked("EMP002".to_string()), Some(true));
    }

    #[test]
    fn test_access_control() {
        let env = odra_test::env();
        let deployer = env.get_account(0);
        let viewer = env.get_account(1);
        let employee = env.get_account(2);
        
        env.set_caller(deployer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Give viewer access level 1
        contract.set_access_level(viewer, 1);
        
        // Issue credential
        contract.issue_credential(
            "EMP003".to_string(),
            employee,
            "QmTestHash123".to_string(),
            75,
            365,
        );
        
        // Viewer can view (level 1)
        env.set_caller(viewer);
        assert!(contract.get_confidence("EMP003".to_string()).is_some());
        
        // Random address cannot view
        let random = env.get_account(3);
        env.set_caller(random);
        assert!(contract.get_confidence("EMP003".to_string()).is_none());
    }
}