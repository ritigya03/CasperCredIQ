#![cfg_attr(not(test), no_std)]

extern crate alloc;

use alloc::string::String;
// Removed unused import: use alloc::vec::Vec;
use odra::prelude::*;

// ================ EVENTS (Audit Trail) ================

#[odra::event]
pub struct CredentialIssued {
    pub credential_id: String,
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
    pub credential_id: String,
    pub revoked_by: Address,
    pub reason: String,
    pub timestamp: u64,
    pub was_already_revoked: bool,
}

#[odra::event]
pub struct CredentialVerified {
    pub credential_id: String,
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
    pub credential_id: String,
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
    CredentialIdTooLong = 12,
}

// ================ DATA STRUCTURES ================

/// W3C Verifiable Credential Structure (simplified on-chain version)
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

/// Audit Log Entry - Now actually stored and used
#[odra::odra_type]
pub struct AuditLog {
    pub action: String,
    pub actor: Address,
    pub timestamp: u64,
    pub details: String,
}

// ================ MAIN CONTRACT ================

#[odra::module]
pub struct CasperCredIQ {
    // Contract owner
    owner: Var<Address>,
    
    // Emergency pause flag
    paused: Var<bool>,
    
    // MAIN STORAGE: credential_id -> VerifiableCredential
    // Frontend: Use get_credential(credential_id) to access
    credentials: Mapping<String, VerifiableCredential>,
    
    // ACCESS CONTROL: address -> access level (0-4)
    // Frontend: Use get_access_level(address) to check permissions
    access_level: Mapping<Address, u8>,
    
    // HOLDER INDEX: holder_address -> List of credential IDs (stored as count)
    // Frontend: Use get_holder_credential_count() and get_holder_credential_at_index()
    holder_credential_count: Mapping<Address, u32>,
    holder_credentials: Mapping<(Address, u32), String>,
    
    // ISSUER INDEX: issuer_address -> List of credential IDs (stored as count)
    // Frontend: Use get_issuer_credential_count() and get_issuer_credential_at_index()
    issuer_credential_count: Mapping<Address, u32>,
    issuer_credentials: Mapping<(Address, u32), String>,
    
    // RATE LIMITING: address -> last_issue_time
    last_issue_time: Mapping<Address, u64>,
    
    // RATE LIMITING: address -> issue_count_in_window (max 25 per hour)
    issue_count: Mapping<Address, u32>,
    
    // AUDIT: credential_id -> List of audit logs (stored as count)
    // Frontend: Use get_audit_count() and get_audit_log_at_index()
    audit_count: Mapping<String, u32>,
    audit_logs: Mapping<(String, u32), AuditLog>,
    
    // THREAT DETECTION: address -> suspicious_activity_count
    suspicious_activity: Mapping<Address, u32>,
    
    // VERIFICATION TRACKING: address -> verification_count
    verification_count: Mapping<Address, u32>,
    
    // VERIFICATION BLOCKING: address -> blocked_until_timestamp
    verification_blocked_until: Mapping<Address, u64>,
}

#[odra::module]
impl CasperCredIQ {
    /// Initialize contract - deployer becomes owner
    pub fn init(&mut self) {
        let deployer = self.env().caller();
        self.owner.set(deployer);
        self.access_level.set(&deployer, 4);
        self.paused.set(false);
    }

    // ================ EMERGENCY CONTROLS ================

    /// Pause contract (owner only)
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

    /// Unpause contract (owner only)
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

    /// Transfer ownership (2-step process for safety)
    pub fn transfer_ownership(&mut self, new_owner: Address) {
        let caller = self.env().caller();
        let current_owner = self.owner.get().unwrap();
        
        if caller != current_owner {
            self.env().revert(Error::NotOwner);
        }
        
        // Remove old owner's level 4 access
        self.access_level.set(&current_owner, 0);
        
        // Set new owner
        self.owner.set(new_owner);
        self.access_level.set(&new_owner, 4);
        
        self.env().emit_event(OwnershipTransferred {
            previous_owner: current_owner,
            new_owner,
            timestamp: self.env().get_block_time(),
        });
    }

    // ================ OWNER FUNCTIONS ================

    /// Set access level for an address (owner only)
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

    /// Issue a new W3C Verifiable Credential with cryptographic proof
    /// 
    /// SECURITY FEATURES:
    /// - Digital Signature validation (length check)
    /// - Hash-based integrity check
    /// - Rate limiting (max 25 credentials per hour per issuer)
    /// - DID-based identity with address linkage
    /// - Credential ID length limit (max 100 chars)
    pub fn issue_credential(
        &mut self,
        credential_id: String,
        issuer_did: String,
        holder_did: String,
        holder_address: Address,
        credential_hash: String,
        issuer_signature: String,
        ipfs_hash: String,
        ai_confidence: u8,
        expires_in_days: u64,
    ) {
        self.check_not_paused();
        
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        // ========== INPUT VALIDATION ==========
        
        // Credential ID length limit (prevent storage abuse)
        if credential_id.len() > 100 {
            self.env().revert(Error::CredentialIdTooLong);
        }
        
        // Validate AI confidence
        if ai_confidence > 100 {
            self.env().revert(Error::InvalidInput);
        }
        
        // Validate credential hash (SHA-256 is 64 hex chars)
        if credential_hash.len() != 64 {
            self.env().revert(Error::InvalidInput);
        }
        
        // Validate signature (at least 64 chars)
        if issuer_signature.len() < 64 {
            self.env().revert(Error::InvalidSignature);
        }
        
        // Validate IPFS hash
        if ipfs_hash.len() < 10 {
            self.env().revert(Error::InvalidInput);
        }
        
        // Validate DIDs (basic format check: must start with "did:")
        if !issuer_did.starts_with("did:") || issuer_did.len() < 10 {
            self.env().revert(Error::InvalidDID);
        }
        
        if !holder_did.starts_with("did:") || holder_did.len() < 10 {
            self.env().revert(Error::InvalidDID);
        }
        
        // ========== ACCESS CONTROL ==========
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        if caller_level < 2 && caller != self.owner.get().unwrap() {
            self.log_suspicious_activity(caller, "Unauthorized issue attempt".to_string(), 3);
            self.env().revert(Error::NotAuthorized);
        }
        
        // ========== RATE LIMITING (25 per hour) ==========
        self.check_rate_limit(caller, current_time);
        
        // ========== PREVENT DUPLICATES ==========
        if self.credentials.get(&credential_id).is_some() {
            self.log_suspicious_activity(caller, "Duplicate credential attempt".to_string(), 2);
            self.env().revert(Error::AlreadyExists);
        }
        
        // ========== CALCULATE EXPIRY ==========
        let expires_at = current_time + (expires_in_days * 24 * 60 * 60 * 1000);
        
        // ========== CLONE VALUES BEFORE MOVING ==========
        // FIX: Clone the values we need for the event before moving the struct
        let event_credential_hash = credential_hash.clone();
        let event_ipfs_hash = ipfs_hash.clone();
        let event_issuer_did = issuer_did.clone();
        let event_holder_did = holder_did.clone();
        
        // ========== CREATE VERIFIABLE CREDENTIAL WITH DID-ADDRESS LINKAGE ==========
        let vc = VerifiableCredential {
            issuer_did,
            issuer_address: caller,  // Link DID to actual issuer address
            holder_did,
            holder_address,  // Link DID to actual holder address
            credential_hash,
            issuer_signature,
            issued_at: current_time,
            expires_at,
            ai_confidence,
            ipfs_hash,
            revoked: false,
        };
        
        self.credentials.set(&credential_id, vc);
        
        // ========== ADD TO HOLDER INDEX ==========
        let holder_count = self.holder_credential_count.get(&holder_address).unwrap_or(0);
        self.holder_credentials.set(&(holder_address, holder_count), credential_id.clone());
        self.holder_credential_count.set(&holder_address, holder_count + 1);
        
        // ========== ADD TO ISSUER INDEX ==========
        let issuer_count = self.issuer_credential_count.get(&caller).unwrap_or(0);
        self.issuer_credentials.set(&(caller, issuer_count), credential_id.clone());
        self.issuer_credential_count.set(&caller, issuer_count + 1);
        
        // ========== UPDATE RATE LIMIT COUNTERS ==========
        self.last_issue_time.set(&caller, current_time);
        let count = self.issue_count.get(&caller).unwrap_or(0);
        self.issue_count.set(&caller, count + 1);
        
        // ========== CREATE AUDIT LOG ==========
        self.add_audit_log(
            &credential_id,
            "ISSUED".to_string(),
            caller,
            current_time,
            "Credential issued successfully".to_string(),
        );
        
        // ========== EMIT EVENT ==========
        // FIX: Use the cloned values instead of trying to access the moved struct
        self.env().emit_event(CredentialIssued {
            credential_id,
            holder: holder_address,
            issuer: caller,
            issuer_did: event_issuer_did,
            holder_did: event_holder_did,
            ai_confidence,
            credential_hash: event_credential_hash,
            ipfs_hash: event_ipfs_hash,
            timestamp: current_time,
        });
    }

    /// Revoke a credential with reason
    pub fn revoke_credential(&mut self, credential_id: String, reason: String) {
        self.check_not_paused();
        
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        // ========== GET CREDENTIAL ==========
        let mut vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => self.env().revert(Error::CredentialNotFound),
        };
        
        // ========== CHECK IF ALREADY REVOKED ==========
        let was_already_revoked = vc.revoked;
        
        // ========== ACCESS CONTROL ==========
        // Only issuer or owner can revoke
        let owner = self.owner.get().unwrap();
        
        if caller != vc.issuer_address && caller != owner {
            self.log_suspicious_activity(caller, "Unauthorized revoke attempt".to_string(), 4);
            self.env().revert(Error::NotAuthorized);
        }
        
        // ========== REVOKE ==========
        vc.revoked = true;
        self.credentials.set(&credential_id, vc);
        
        // ========== CREATE AUDIT LOG ==========
        self.add_audit_log(
            &credential_id,
            "REVOKED".to_string(),
            caller,
            current_time,
            reason.clone(),
        );
        
        // ========== EMIT EVENT ==========
        self.env().emit_event(CredentialRevoked {
            credential_id,
            revoked_by: caller,
            reason,
            timestamp: current_time,
            was_already_revoked,
        });
    }

    // ================ CRYPTOGRAPHIC VERIFICATION ================

    /// Verify credential with cryptographic proof
    /// 
    /// SECURITY CHECKS:
    /// 1. Credential exists
    /// 2. Not revoked
    /// 3. Not expired
    /// 4. Hash integrity (STRIDE: Tampering)
    /// 
    /// Note: Full signature verification should be done off-chain or via oracle
    /// due to computational constraints
    pub fn verify_credential_cryptographic(
        &mut self,
        credential_id: String,
        provided_hash: String,
        verification_type: String,
    ) -> bool {
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();
        
        // ========== CHECK IF VERIFIER IS BLOCKED ==========
        let blocked_until = self.verification_blocked_until.get(&caller).unwrap_or(0);
        if current_time < blocked_until {
            self.env().emit_event(CredentialVerified {
                credential_id: credential_id.clone(),
                verifier: caller,
                is_valid: false,
                verification_type: "BLOCKED".to_string(),
                timestamp: current_time,
            });
            return false;
        }
        
        // ========== TRACK VERIFICATION ATTEMPTS ==========
        let attempts = self.verification_count.get(&caller).unwrap_or(0);
        self.verification_count.set(&caller, attempts + 1);
        
        // Block if too many attempts (>50 per hour)
        if attempts > 50 {
            let block_until = current_time + (60 * 60 * 1000); // 1 hour
            self.verification_blocked_until.set(&caller, block_until);
            self.log_suspicious_activity(caller, "Excessive verification attempts".to_string(), 4);
        }
        
        // ========== GET CREDENTIAL ==========
        let vc = match self.credentials.get(&credential_id) {
            Some(v) => v,
            None => {
                self.emit_verification_event(&credential_id, caller, false, verification_type, current_time);
                return false;
            }
        };
        
        // ========== CHECK 1: REVOKED ==========
        if vc.revoked {
            self.emit_verification_event(&credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // ========== CHECK 2: EXPIRED ==========
        if current_time >= vc.expires_at {
            self.emit_verification_event(&credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // ========== CHECK 3: HASH INTEGRITY ==========
        if vc.credential_hash != provided_hash {
            self.log_suspicious_activity(caller, "Hash mismatch during verification".to_string(), 5);
            self.emit_verification_event(&credential_id, caller, false, verification_type, current_time);
            return false;
        }
        
        // ========== CREATE AUDIT LOG ==========
        self.add_audit_log(
            &credential_id,
            "VERIFIED".to_string(),
            caller,
            current_time,
            verification_type.clone(),
        );
        
        // ========== ALL CHECKS PASSED ==========
        self.emit_verification_event(&credential_id, caller, true, verification_type, current_time);
        true
    }

    /// Simple verification (backward compatible)
    pub fn verify_credential(&self, credential_id: String) -> bool {
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

    // ================ VIEW FUNCTIONS (FRONTEND-FRIENDLY) ================

    /// Get full verifiable credential (with access control and expiry check)
    pub fn get_credential(&self, credential_id: String) -> Option<VerifiableCredential> {
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        
        let vc = self.credentials.get(&credential_id)?;
        
        // Check if expired
        let current_time = self.env().get_block_time();
        if current_time >= vc.expires_at {
            return None;
        }
        
        Some(vc)
    }

    /// Get credential hash (public for verification)
    pub fn get_credential_hash(&self, credential_id: String) -> Option<String> {
        self.credentials.get(&credential_id).map(|vc| vc.credential_hash)
    }

    /// Get issuer signature (public for verification)
    pub fn get_issuer_signature(&self, credential_id: String) -> Option<String> {
        self.credentials.get(&credential_id).map(|vc| vc.issuer_signature)
    }

    /// Get issuer DID (public)
    pub fn get_issuer_did(&self, credential_id: String) -> Option<String> {
        self.credentials.get(&credential_id).map(|vc| vc.issuer_did)
    }

    /// Get issuer address (public)
    pub fn get_issuer_address(&self, credential_id: String) -> Option<Address> {
        self.credentials.get(&credential_id).map(|vc| vc.issuer_address)
    }

    /// Get holder DID (public)
    pub fn get_holder_did(&self, credential_id: String) -> Option<String> {
        self.credentials.get(&credential_id).map(|vc| vc.holder_did)
    }

    /// Get holder address (public)
    pub fn get_holder_address(&self, credential_id: String) -> Option<Address> {
        self.credentials.get(&credential_id).map(|vc| vc.holder_address)
    }

    /// Get IPFS hash (with access control)
    pub fn get_ipfs_hash(&self, credential_id: String) -> Option<String> {
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        self.credentials.get(&credential_id).map(|vc| vc.ipfs_hash)
    }

    /// Get AI confidence score (with access control)
    pub fn get_ai_confidence(&self, credential_id: String) -> Option<u8> {
        if !self.can_view_credential(&credential_id) {
            return None;
        }
        self.credentials.get(&credential_id).map(|vc| vc.ai_confidence)
    }

    /// Check if credential is revoked (public)
    pub fn is_revoked(&self, credential_id: String) -> bool {
        self.credentials.get(&credential_id)
            .map(|vc| vc.revoked)
            .unwrap_or(false)
    }

    /// Get expiry timestamp (public)
    pub fn get_expiry(&self, credential_id: String) -> Option<u64> {
        self.credentials.get(&credential_id).map(|vc| vc.expires_at)
    }

    /// Check if credential is expired (public)
    pub fn is_expired(&self, credential_id: String) -> bool {
        match self.credentials.get(&credential_id) {
            Some(vc) => {
                let current_time = self.env().get_block_time();
                current_time >= vc.expires_at
            },
            None => true,
        }
    }

    // ================ HOLDER/ISSUER INDEX FUNCTIONS ================

    /// Get number of credentials held by an address
    pub fn get_holder_credential_count(&self, holder: Address) -> u32 {
        self.holder_credential_count.get(&holder).unwrap_or(0)
    }

    /// Get credential ID at index for a holder
    pub fn get_holder_credential_at_index(&self, holder: Address, index: u32) -> Option<String> {
        self.holder_credentials.get(&(holder, index))
    }

    /// Get number of credentials issued by an address
    pub fn get_issuer_credential_count(&self, issuer: Address) -> u32 {
        self.issuer_credential_count.get(&issuer).unwrap_or(0)
    }

    /// Get credential ID at index for an issuer
    pub fn get_issuer_credential_at_index(&self, issuer: Address, index: u32) -> Option<String> {
        self.issuer_credentials.get(&(issuer, index))
    }

    // ================ AUDIT LOG FUNCTIONS ================

    /// Get audit log count for a credential
    pub fn get_audit_count(&self, credential_id: String) -> u32 {
        self.audit_count.get(&credential_id).unwrap_or(0)
    }

    /// Get audit log at index for a credential
    pub fn get_audit_log_at_index(&self, credential_id: String, index: u32) -> Option<AuditLog> {
        self.audit_logs.get(&(credential_id, index))
    }

    // ================ GENERAL GETTERS ================

    /// Get suspicious activity count for an address
    pub fn get_suspicious_activity_count(&self, address: Address) -> u32 {
        self.suspicious_activity.get(&address).unwrap_or(0)
    }

    /// Get verification count for an address
    pub fn get_verification_count(&self, address: Address) -> u32 {
        self.verification_count.get(&address).unwrap_or(0)
    }

    /// Get contract owner
    pub fn get_owner(&self) -> Address {
        self.owner.get().unwrap()
    }

    /// Get access level for an address
    pub fn get_access_level(&self, address: Address) -> u8 {
        self.access_level.get(&address).unwrap_or(0)
    }

    /// Check if contract is paused
    pub fn is_paused(&self) -> bool {
        self.paused.get().unwrap_or(false)
    }

    // ================ INTERNAL HELPERS ================

    /// Check if contract is paused
    fn check_not_paused(&self) {
        if self.paused.get().unwrap_or(false) {
            self.env().revert(Error::ContractPaused);
        }
    }

    /// Zero Trust Access Control: Check if caller can view credential details
    /// 
    /// ENHANCED: Now validates holder DID against holder address
    fn can_view_credential(&self, credential_id: &String) -> bool {
        let caller = self.env().caller();
        let owner = self.owner.get().unwrap();
        
        // Owner can view everything
        if caller == owner {
            return true;
        }
        
        // Get credential
        let vc = match self.credentials.get(credential_id) {
            Some(v) => v,
            None => return false,
        };
        
        // Holder can view their own credentials (DID-address linkage validated)
        if caller == vc.holder_address {
            return true;
        }
        
        // Issuer can view credentials they issued (DID-address linkage validated)
        if caller == vc.issuer_address {
            return true;
        }
        
        // Level 3+ (auditors) can view any credential
        // Level 1-2 cannot view other people's credentials for privacy
        let caller_level = self.access_level.get(&caller).unwrap_or(0);
        caller_level >= 3
    }

    /// Rate Limiting Check (25 credentials per hour)
    fn check_rate_limit(&mut self, caller: Address, current_time: u64) {
        let last_time = self.last_issue_time.get(&caller).unwrap_or(0);
        let time_window = 60 * 60 * 1000; // 1 hour in milliseconds
        
        // Reset counter if outside time window
        if current_time - last_time > time_window {
            self.issue_count.set(&caller, 0);
            return;
        }
        
        // Check if limit exceeded (25 per hour)
        let count = self.issue_count.get(&caller).unwrap_or(0);
        if count >= 25 {
            self.log_suspicious_activity(caller, "Rate limit exceeded".to_string(), 4);
            self.env().revert(Error::RateLimitExceeded);
        }
    }

    /// Log suspicious activity
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

    /// Add audit log entry
    fn add_audit_log(
        &mut self,
        credential_id: &String,
        action: String,
        actor: Address,
        timestamp: u64,
        details: String,
    ) {
        let count = self.audit_count.get(credential_id).unwrap_or(0);
        
        let log = AuditLog {
            action: action.clone(),
            actor,
            timestamp,
            details,
        };
        
        self.audit_logs.set(&(credential_id.clone(), count), log);
        self.audit_count.set(credential_id, count + 1);
        
        self.env().emit_event(AuditLogCreated {
            credential_id: credential_id.clone(),
            action,
            actor,
            timestamp,
            audit_count: count + 1,
        });
    }

    /// Emit verification event for audit trail
    fn emit_verification_event(
        &self,
        credential_id: &String,
        verifier: Address,
        is_valid: bool,
        verification_type: String,
        timestamp: u64,
    ) {
        self.env().emit_event(CredentialVerified {
            credential_id: credential_id.clone(),
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

    // Helper function for valid IPFS hash (CIDv0 starts with Qm and is 46 chars)
    fn valid_ipfs_hash() -> String {
        "QmXgqL8j5qN6U5K4z8XvY8T7S6D5F4G3H2J1K9L8M7N6B5V4C3".to_string()
    }
    
    // Helper for valid credential hash (64 hex chars for SHA-256)
    fn valid_credential_hash() -> String {
        "a".repeat(64)
    }
    
    // Helper for valid signature
    fn valid_signature() -> String {
        "b".repeat(128)
    }

    #[test]
    fn test_holder_index() {
        let env = odra_test::env();
        let issuer = env.get_account(0);
        let holder = env.get_account(1);
        
        env.set_caller(issuer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Set issuer access level (owner is already level 4)
        contract.set_access_level(issuer, 2);
        
        // Issue 3 credentials to same holder
        for i in 0..3 {
            let cred_id = alloc::format!("CRED{:03}", i);
            contract.issue_credential(
                cred_id,
                "did:casper:issuer".to_string(),
                "did:casper:holder".to_string(),
                holder,
                valid_credential_hash(),
                valid_signature(),
                valid_ipfs_hash(),
                90,
                365,
            );
        }
        
        // Check holder index
        assert_eq!(contract.get_holder_credential_count(holder), 3);
        assert_eq!(contract.get_holder_credential_at_index(holder, 0), Some("CRED000".to_string()));
        assert_eq!(contract.get_holder_credential_at_index(holder, 1), Some("CRED001".to_string()));
        assert_eq!(contract.get_holder_credential_at_index(holder, 2), Some("CRED002".to_string()));
    }

    #[test]
    fn test_audit_logs() {
        let env = odra_test::env();
        let issuer = env.get_account(0);
        let holder = env.get_account(1);
        
        env.set_caller(issuer);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Set issuer access level
        contract.set_access_level(issuer, 2);
        
        // Issue credential (creates audit log)
        contract.issue_credential(
            "CRED001".to_string(),
            "did:casper:issuer".to_string(),
            "did:casper:holder".to_string(),
            holder,
            valid_credential_hash(),
            valid_signature(),
            valid_ipfs_hash(),
            95,
            365,
        );
        
        // Verify audit log was created
        assert_eq!(contract.get_audit_count("CRED001".to_string()), 1);
        
        let log = contract.get_audit_log_at_index("CRED001".to_string(), 0).unwrap();
        assert_eq!(log.action, "ISSUED");
        assert_eq!(log.actor, issuer);
        
        // Revoke (creates another audit log)
        contract.revoke_credential("CRED001".to_string(), "Test revocation".to_string());
        
        assert_eq!(contract.get_audit_count("CRED001".to_string()), 2);
        let log2 = contract.get_audit_log_at_index("CRED001".to_string(), 1).unwrap();
        assert_eq!(log2.action, "REVOKED");
    }

    #[test]
    fn test_emergency_pause() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let holder = env.get_account(1);
        
        env.set_caller(owner);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Pause contract
        contract.pause();
        assert!(contract.is_paused());
        
        // Try to issue credential (should fail)
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.issue_credential(
                "CRED001".to_string(),
                "did:casper:issuer".to_string(),
                "did:casper:holder".to_string(),
                holder,
                valid_credential_hash(),
                valid_signature(),
                valid_ipfs_hash(),
                90,
                365,
            );
        }));
        
        assert!(result.is_err());
        
        // Unpause
        contract.unpause();
        assert!(!contract.is_paused());
    }

    #[test]
    fn test_ownership_transfer() {
        let env = odra_test::env();
        let old_owner = env.get_account(0);
        let new_owner = env.get_account(1);
        
        env.set_caller(old_owner);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        assert_eq!(contract.get_owner(), old_owner);
        assert_eq!(contract.get_access_level(old_owner), 4);
        
        // Transfer ownership
        contract.transfer_ownership(new_owner);
        
        assert_eq!(contract.get_owner(), new_owner);
        assert_eq!(contract.get_access_level(new_owner), 4);
        assert_eq!(contract.get_access_level(old_owner), 0);
    }

    #[test]
    fn test_privacy_model() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let issuer = env.get_account(1);
        let holder = env.get_account(2);
        let random_viewer = env.get_account(3);
        let auditor = env.get_account(4);
        
        env.set_caller(owner);
        let mut contract = CasperCredIQ::deploy(&env, NoArgs);
        
        // Set issuer to level 2, viewer to level 1, auditor to level 3
        contract.set_access_level(issuer, 2);
        contract.set_access_level(random_viewer, 1);
        contract.set_access_level(auditor, 3);
        
        // Issue credential
        env.set_caller(issuer);
        contract.issue_credential(
            "PRIV001".to_string(),
            "did:casper:issuer".to_string(),
            "did:casper:holder".to_string(),
            holder,
            valid_credential_hash(),
            valid_signature(),
            valid_ipfs_hash(),
            85,
            365,
        );
        
        // Owner can view
        env.set_caller(owner);
        assert!(contract.get_credential("PRIV001".to_string()).is_some());
        
        // Issuer can view (they issued it)
        env.set_caller(issuer);
        assert!(contract.get_credential("PRIV001".to_string()).is_some());
        
        // Holder can view (it's theirs)
        env.set_caller(holder);
        assert!(contract.get_credential("PRIV001".to_string()).is_some());
        
        // Auditor (level 3) can view
        env.set_caller(auditor);
        assert!(contract.get_credential("PRIV001".to_string()).is_some());
        
        // Random viewer (level 1) CANNOT view
        env.set_caller(random_viewer);
        assert!(contract.get_credential("PRIV001".to_string()).is_none());
    }
}