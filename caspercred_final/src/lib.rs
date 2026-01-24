#![cfg_attr(not(test), no_std)]

extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;
use odra::prelude::*;
use odra::casper_types::U256;

// ================ EVENTS (Audit Trail) ================

#[odra::event]
pub struct CredentialIssued {
    pub credential_id: U256,
    pub holder: Address,
    pub issuer: Address,
    pub issuer_did: String,
    pub holder_did: String,
    pub ai_confidence: u8,
    pub credential_hash: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
}

#[odra::event]
pub struct CredentialRevoked {
    pub credential_id: U256,
    pub revoked_by: Address,
    pub reason: String,
    pub timestamp: u64,
    pub was_already_revoked: bool,
}

#[odra::event]
pub struct CredentialVerified {
    pub credential_id: U256,
    pub verifier: Address,
    pub is_valid: bool,
    pub verification_type: String,
    pub timestamp: u64,
}

#[odra::event]
pub struct AccessLevelChanged {
    pub user: Address,
    pub old_level: u8,
    pub new_level: u8,
    pub changed_by: Address,
    pub timestamp: u64,
}

#[odra::event]
pub struct SuspiciousActivity {
    pub actor: Address,
    pub action: String,
    pub severity: u8,
    pub timestamp: u64,
}

#[odra::event]
pub struct OwnershipTransferred {
    pub previous_owner: Address,
    pub new_owner: Address,
    pub timestamp: u64,
}

#[odra::event]
pub struct ContractPaused {
    pub paused_by: Address,
    pub timestamp: u64,
}

#[odra::event]
pub struct ContractUnpaused {
    pub unpaused_by: Address,
    pub timestamp: u64,
}

#[odra::event]
pub struct AuditLogCreated {
    pub credential_id: U256,
    pub action: String,
    pub actor: Address,
    pub timestamp: u64,
    pub audit_count: u32,
}

// ================ ERRORS ================

#[odra::odra_error]
pub enum Error {
    NotOwner = 0,
    NotAuthorized = 1,
    CredentialNotFound = 2,
    AlreadyExists = 3,
    InvalidInput = 4,
    InvalidSignature = 5,
    HashMismatch = 6,
    RateLimitExceeded = 7,
    ExpiredCredential = 8,
    RevokedCredential = 9,
    ContractPaused = 10,
    InvalidDID = 11,
}

// ================ DATA STRUCTURES ================

/// W3C Verifiable Credential Structure
#[odra::odra_type]
pub struct VerifiableCredential {
    pub issuer_did: String,
    pub issuer_address: Address,
    pub holder_did: String,
    pub holder_address: Address,
    pub credential_hash: String,
    pub issuer_signature: String,
    pub issued_at: u64,
    pub expires_at: u64,
    pub ai_confidence: u8,
    pub ipfs_hash: String,
    pub revoked: bool,
}

/// Audit Log Entry
#[odra::odra_type]
pub struct AuditLog {
    pub action: String,
    pub actor: Address,
    pub timestamp: u64,
    pub details: String,
}

/// Rate Limit Data (combines last_issue_time + issue_count)
#[odra::odra_type]
pub struct RateLimitData {
    pub last_issue_time: u64,
    pub issue_count: u32,
}

/// Verification Data (combines verification_count + blocked_until)
#[odra::odra_type]
pub struct VerificationData {
    pub verification_count: u32,
    pub blocked_until: u64,
}

// ================ MAIN CONTRACT (14 fields - under limit!) ================

#[odra::module]
pub struct CasperCredIQ {
    owner: Var<Address>,
    paused: Var<bool>,
    credential_counter: Var<U256>,
    
    // Main storage
    credentials: Mapping<U256, VerifiableCredential>,
    
    // Access control
    access_level: Mapping<Address, u8>,
    
    // Indexes (combined into 2 mappings instead of 4)
    holder_credentials: Mapping<(Address, u32), U256>,  // (holder, index) -> cred_id
    issuer_credentials: Mapping<(Address, u32), U256>,  // (issuer, index) -> cred_id
    
    // Counts stored as single values (not separate mappings)
    holder_count: Mapping<Address, u32>,
    issuer_count: Mapping<Address, u32>,
    
    // Rate limiting (combined into single struct)
    rate_limit: Mapping<Address, RateLimitData>,
    
    // Audit logs
    audit_logs: Mapping<(U256, u32), AuditLog>,
    audit_count: Mapping<U256, u32>,
    
    // Security (combined verification tracking)
    verification_data: Mapping<Address, VerificationData>,
    suspicious_activity: Mapping<Address, u32>,
}

#[odra::module]
impl CasperCredIQ {
    pub fn init(&mut self) {
        let deployer = self.env().caller();
        self.owner.set(deployer);
        self.access_level.set(&deployer, 4);
        self.paused.set(false);
        self.credential_counter.set(U256::zero());
    }

    // ================ EMERGENCY CONTROLS ================

    pub fn pause(&mut self) {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        if caller != owner {
            self.env().revert(Error::NotOwner);
        }
        
        self.paused.set(true);
        
        self.env().emit_event(ContractPaused {
            paused_by: caller,
            timestamp: self.env().get_block_time(),
        });
    }

    pub fn unpause(&mut self) {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        if caller != owner {
            self.env().revert(Error::NotOwner);
        }
        
        self.paused.set(false);
        
        self.env().emit_event(ContractUnpaused {
            unpaused_by: caller,
            timestamp: self.env().get_block_time(),
        });
    }

    pub fn transfer_ownership(&mut self, new_owner: Address) {
        let caller = self.env().caller();
        let current_owner = self.owner.get().unwrap();
        
        if caller != current_owner {
            self.env().revert(Error::NotOwner);
        }
        
        self.access_level.set(&current_owner, 0);
        self.owner.set(new_owner);
        self.access_level.set(&new_owner, 4);
        
        self.env().emit_event(OwnershipTransferred {
            previous_owner: current_owner,
            new_owner,
            timestamp: self.env().get_block_time(),
        });
    }

    // ================ OWNER FUNCTIONS ================

    pub fn set_access_level(&mut self, user: Address, level: u8) {
        self.check_not_paused();
        
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        if caller != owner {
            self.env().revert(Error::NotOwner);
        }
        
        if level > 4 {
            self.env().revert(Error::InvalidInput);
        }
        
        let old_level = self.access_level.get(&user).unwrap_or(0);
        self.access_level.set(&user, level);
        
        self.env().emit_event(AccessLevelChanged {
            user,
            old_level,
            new_level: level,
            changed_by: caller,
            timestamp: self.env().get_block_time(),
        });
    }

    // ================ CREDENTIAL FUNCTIONS ================

    pub fn issue_credential(
        &mut self,
        issuer_did: String,
        holder_did: String,
        holder_address: Address,
        credential_hash: String,
        issuer_signature: String,
        ipfs_hash: String,
        ai_confidence: u8,
        expires_in_days: u64,
    ) -> U256 {
        self.check_not_paused();
        
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        // Validate inputs
        if ai_confidence > 100 {
            self.env().revert(Error::InvalidInput);
        }
        
        if credential_hash.len() != 64 {
            self.env().revert(Error::InvalidInput);
        }
        
        if issuer_signature.len() < 64 {
            self.env().revert(Error::InvalidSignature);
        }
        
        if ipfs_hash.len() < 10 {
            self.env().revert(Error::InvalidInput);
        }
        
        if !issuer_did.starts_with("did:") || issuer_did.len() < 10 {
            self.env().revert(Error::InvalidDID);
        }
        
        if !holder_did.starts_with("did:") || holder_did.len() < 10 {
            self.env().revert(Error::InvalidDID);
        }
        
        // Access control
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        if caller_level < 2 && caller != self.owner.get().unwrap() {
            self.log_suspicious_activity(caller, "Unauthorized issue attempt".to_string(), 3);
            self.env().revert(Error::NotAuthorized);
        }
        
        // Rate limiting
        self.check_rate_limit(caller, current_time);
        
        // Generate ID
        let credential_id = self.credential_counter.get().unwrap();
        self.credential_counter.set(credential_id + U256::one());
        
        // Calculate expiry
        let expires_at = current_time + (expires_in_days * 24 * 60 * 60 * 1000);
        
        // Create credential
        let vc = VerifiableCredential {
            issuer_did: issuer_did.clone(),
            issuer_address: caller,
            holder_did: holder_did.clone(),
            holder_address,
            credential_hash: credential_hash.clone(),
            issuer_signature: issuer_signature.clone(),
            issued_at: current_time,
            expires_at,
            ai_confidence,
            ipfs_hash: ipfs_hash.clone(),
            revoked: false,
        };
        
        self.credentials.set(&credential_id, vc);
        
        // Add to holder index
        let holder_idx = self.holder_count.get(&holder_address).unwrap_or(0);
        self.holder_credentials.set(&(holder_address, holder_idx), credential_id);
        self.holder_count.set(&holder_address, holder_idx + 1);
        
        // Add to issuer index
        let issuer_idx = self.issuer_count.get(&caller).unwrap_or(0);
        self.issuer_credentials.set(&(caller, issuer_idx), credential_id);
        self.issuer_count.set(&caller, issuer_idx + 1);
        
        // Update rate limit
        let mut rl = self.rate_limit.get(&caller).unwrap_or(RateLimitData {
            last_issue_time: 0,
            issue_count: 0,
        });
        rl.last_issue_time = current_time;
        rl.issue_count += 1;
        self.rate_limit.set(&caller, rl);
        
        // Create audit log
        self.add_audit_log(
            credential_id,
            "ISSUED".to_string(),
            caller,
            current_time,
            "Credential issued successfully".to_string(),
        );
        
        self.env().emit_event(CredentialIssued {
            credential_id,
            holder: holder_address,
            issuer: caller,
            issuer_did,
            holder_did,
            ai_confidence,
            credential_hash,
            ipfs_hash,
            timestamp: current_time,
        });
        
        credential_id
    }

    pub fn revoke_credential(&mut self, credential_id: U256, reason: String) {
        self.check_not_paused();
        
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        let mut vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => self.env().revert(Error::CredentialNotFound),
        };
        
        let was_already_revoked = vc.revoked;
        
        let owner = self.owner.get().unwrap();
        
        if caller != vc.issuer_address && caller != owner {
            self.log_suspicious_activity(caller, "Unauthorized revoke attempt".to_string(), 4);
            self.env().revert(Error::NotAuthorized);
        }
        
        vc.revoked = true;
        self.credentials.set(&credential_id, vc);
        
        self.add_audit_log(
            credential_id,
            "REVOKED".to_string(),
            caller,
            current_time,
            reason.clone(),
        );
        
        self.env().emit_event(CredentialRevoked {
            credential_id,
            revoked_by: caller,
            reason,
            timestamp: current_time,
            was_already_revoked,
        });
    }

    // ================ CRYPTOGRAPHIC VERIFICATION ================

    pub fn verify_credential_cryptographic(
        &mut self,
        credential_id: U256,
        provided_hash: String,
        verification_type: String,
    ) -> bool {
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        // Get verification data
        let mut vd = self.verification_data.get(&caller).unwrap_or(VerificationData {
            verification_count: 0,
            blocked_until: 0,
        });
        
        // Check if blocked
        if current_time < vd.blocked_until {
            self.env().emit_event(CredentialVerified {
                credential_id,
                verifier: caller,
                is_valid: false,
                verification_type: "BLOCKED".to_string(),
                timestamp: current_time,
            });
            return false;
        }
        
        // Update verification count
        vd.verification_count += 1;
        
        // Block if too many attempts
        if vd.verification_count > 50 {
            vd.blocked_until = current_time + (60 * 60 * 1000);
            self.log_suspicious_activity(caller, "Excessive verification attempts".to_string(), 4);
        }
        
        self.verification_data.set(&caller, vd);
        
        // Get credential
        let vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => {
                self.emit_verification_event(credential_id, caller, false, verification_type, current_time);
                return false;
            }
        };
        
        // Check revoked
        if vc.revoked {
            self.emit_verification_event(credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // Check expired
        if current_time >= vc.expires_at {
            self.emit_verification_event(credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // Check hash
        if vc.credential_hash != provided_hash {
            self.log_suspicious_activity(caller, "Hash mismatch during verification".to_string(), 5);
            self.emit_verification_event(credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // Create audit log
        self.add_audit_log(
            credential_id,
            "VERIFIED".to_string(),
            caller,
            current_time,
            verification_type.clone(),
        );
        
        self.emit_verification_event(credential_id, caller, true, verification_type, current_time);
        true
    }

    pub fn verify_credential(&self, credential_id: U256) -> bool {
        let vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => return false,
        };
        
        if vc.revoked {
            return false;
        }
        
        let current_time = self.env().get_block_time();
        current_time < vc.expires_at
    }

    // ================ VIEW FUNCTIONS ================

    pub fn get_credential(&self, credential_id: U256) -> Option<VerifiableCredential> {
        if !self.can_view_credential(credential_id) {
            return None;
        }
        
        let vc = self.credentials.get(&credential_id)?;
        
        let current_time = self.env().get_block_time();
        if current_time >= vc.expires_at {
            return None;
        }
        
        Some(vc)
    }

    pub fn is_revoked(&self, credential_id: U256) -> bool {
        self.credentials.get(&credential_id)
            .map(|vc| vc.revoked)
            .unwrap_or(false)
    }

    // ================ INDEX FUNCTIONS ================

    pub fn get_holder_credential_count(&self, holder: Address) -> u32 {
        self.holder_count.get(&holder).unwrap_or(0)
    }

    pub fn get_holder_credential_at_index(&self, holder: Address, index: u32) -> Option<U256> {
        self.holder_credentials.get(&(holder, index))
    }

    pub fn get_issuer_credential_count(&self, issuer: Address) -> u32 {
        self.issuer_count.get(&issuer).unwrap_or(0)
    }

    pub fn get_issuer_credential_at_index(&self, issuer: Address, index: u32) -> Option<U256> {
        self.issuer_credentials.get(&(issuer, index))
    }

    // ================ AUDIT LOG FUNCTIONS ================

    pub fn get_audit_count(&self, credential_id: U256) -> u32 {
        self.audit_count.get(&credential_id).unwrap_or(0)
    }

    pub fn get_audit_log_at_index(&self, credential_id: U256, index: u32) -> Option<AuditLog> {
        self.audit_logs.get(&(credential_id, index))
    }

    // ================ GENERAL GETTERS ================

    pub fn get_suspicious_activity_count(&self, address: Address) -> u32 {
        self.suspicious_activity.get(&address).unwrap_or(0)
    }

    pub fn get_verification_count(&self, address: Address) -> u32 {
        self.verification_data.get(&address)
            .map(|vd| vd.verification_count)
            .unwrap_or(0)
    }

    pub fn get_owner(&self) -> Address {
        self.owner.get().unwrap()
    }

    pub fn get_access_level(&self, address: Address) -> u8 {
        self.access_level.get(&address).unwrap_or(0)
    }

    pub fn is_paused(&self) -> bool {
        self.paused.get().unwrap_or(false)
    }
    
    pub fn get_total_credentials(&self) -> U256 {
        self.credential_counter.get().unwrap()
    }

    // ================ INTERNAL HELPERS ================

    fn check_not_paused(&self) {
        if self.paused.get().unwrap_or(false) {
            self.env().revert(Error::ContractPaused);
        }
    }

    fn can_view_credential(&self, credential_id: U256) -> bool {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        if caller == owner {
            return true;
        }
        
        let vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => return false,
        };
        
        if caller == vc.holder_address {
            return true;
        }
        
        if caller == vc.issuer_address {
            return true;
        }
        
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        caller_level >= 3
    }

    fn check_rate_limit(&mut self, caller: Address, current_time: u64) {
        let mut rl = self.rate_limit.get(&caller).unwrap_or(RateLimitData {
            last_issue_time: 0,
            issue_count: 0,
        });
        
        let time_window = 60 * 60 * 1000;
        
        // Reset if outside window
        if current_time - rl.last_issue_time > time_window {
            rl.issue_count = 0;
            self.rate_limit.set(&caller, rl);
            return;
        }
        
        // Check limit
        if rl.issue_count >= 25 {
            self.log_suspicious_activity(caller, "Rate limit exceeded".to_string(), 4);
            self.env().revert(Error::RateLimitExceeded);
        }
    }

    fn log_suspicious_activity(&mut self, actor: Address, action: String, severity: u8) {
        let current_count = self.suspicious_activity.get(&actor).unwrap_or(0);
        self.suspicious_activity.set(&actor, current_count + 1);
        
        self.env().emit_event(SuspiciousActivity {
            actor,
            action,
            severity,
            timestamp: self.env().get_block_time(),
        });
    }

    fn add_audit_log(
        &mut self,
        credential_id: U256,
        action: String,
        actor: Address,
        timestamp: u64,
        details: String,
    ) {
        let count = self.audit_count.get(&credential_id).unwrap_or(0);
        
        let log = AuditLog {
            action: action.clone(),
            actor,
            timestamp,
            details,
        };
        
        self.audit_logs.set(&(credential_id, count), log);
        self.audit_count.set(&credential_id, count + 1);
        
        self.env().emit_event(AuditLogCreated {
            credential_id,
            action,
            actor,
            timestamp,
            audit_count: count + 1,
        });
    }

    fn emit_verification_event(
        &self,
        credential_id: U256,
        verifier: Address,
        is_valid: bool,
        verification_type: String,
        timestamp: u64,
    ) {
        self.env().emit_event(CredentialVerified {
            credential_id,
            verifier,
            is_valid,
            verification_type,
            timestamp,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    fn valid_ipfs_hash() -> String {
        "QmXgqL8j5qN6U5K4z8XvY8T7S6D5F4G3H2J1K9L8M7N6B5V4C3".to_string()
    }
    
    fn valid_credential_hash() -> String {
        "a".repeat(64)
    }
    
    fn valid_signature() -> String {
        "b".repeat(128)
    }

    #[test]
    fn test_issue_and_verify() {
        let env = odra_test::env();
        let issuer = env.get_account(0);
        let holder = env.get_account(1);
        
        env.set_caller(issuer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        contract.set_access_level(issuer, 2);
        
        let id = contract.issue_credential(
            "did:casper:issuer".to_string(),
            "did:casper:holder".to_string(),
            holder,
            valid_credential_hash(),
            valid_signature(),
            valid_ipfs_hash(),
            90,
            365,
        );
        
        assert_eq!(id, U256::zero());
        
        let vc = contract.get_credential(id).unwrap();
        assert_eq!(vc.ai_confidence, 90);
        assert!(!vc.revoked);
        
        assert!(contract.verify_credential(id));
    }

    #[test]
    fn test_revocation() {
        let env = odra_test::env();
        let issuer = env.get_account(0);
        let holder = env.get_account(1);
        
        env.set_caller(issuer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        contract.set_access_level(issuer, 2);
        
        let id = contract.issue_credential(
            "did:casper:issuer".to_string(),
            "did:casper:holder".to_string(),
            holder,
            valid_credential_hash(),
            valid_signature(),
            valid_ipfs_hash(),
            95,
            365,
        );
        
        contract.revoke_credential(id, "Test".to_string());
        assert!(contract.is_revoked(id));
        assert!(!contract.verify_credential(id));
    }
}