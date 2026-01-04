#![cfg_attr(not(test), no_std)]

extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;

use odra::prelude::*;
use odra::casper_types::{
    bytesrepr::{FromBytes, ToBytes, Error as BytesError},
    CLType, CLTyped,
};

/// Credential stored on-chain
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Credential {
    pub role: String,
    pub issued_at: u64,
    pub expires_at: u64,
    pub revoked: bool,
    pub issuer: Address,  // Track who issued it
}

impl CLTyped for Credential {
    fn cl_type() -> CLType {
        CLType::Any
    }
}

impl ToBytes for Credential {
    fn to_bytes(&self) -> Result<Vec<u8>, BytesError> {
        let mut bytes = Vec::new();
        bytes.extend(self.role.to_bytes()?);
        bytes.extend(self.issued_at.to_bytes()?);
        bytes.extend(self.expires_at.to_bytes()?);
        bytes.extend(self.revoked.to_bytes()?);
        bytes.extend(self.issuer.to_bytes()?);
        Ok(bytes)
    }

    fn serialized_length(&self) -> usize {
        self.role.serialized_length()
            + self.issued_at.serialized_length()
            + self.expires_at.serialized_length()
            + self.revoked.serialized_length()
            + self.issuer.serialized_length()
    }
}

impl FromBytes for Credential {
    fn from_bytes(bytes: &[u8]) -> Result<(Self, &[u8]), BytesError> {
        let (role, rem) = String::from_bytes(bytes)?;
        let (issued_at, rem) = u64::from_bytes(rem)?;
        let (expires_at, rem) = u64::from_bytes(rem)?;
        let (revoked, rem) = bool::from_bytes(rem)?;
        let (issuer, rem) = Address::from_bytes(rem)?;

        Ok((
            Credential {
                role,
                issued_at,
                expires_at,
                revoked,
                issuer,
            },
            rem,
        ))
    }
}

/// Events
#[odra::event]
pub struct CredentialIssued {
    pub user: Address,
    pub role: String,
    pub expires_at: u64,
    pub issuer: Address,
}

#[odra::event]
pub struct CredentialRevoked {
    pub user: Address,
    pub issuer: Address,
}

#[odra::event]
pub struct IssuerAdded {
    pub issuer: Address,
    pub added_by: Address,
}

#[odra::event]
pub struct IssuerRemoved {
    pub issuer: Address,
    pub removed_by: Address,
}

/// Errors
#[odra::odra_error]
pub enum Error {
    NotAuthorized = 1,
    NotIssued = 2,
    NotOwner = 3,
    AlreadyIssuer = 4,
    NotAnIssuer = 5,
}

/// Multi-Issuer Credential Contract
#[odra::module]
pub struct CasperCred {
    /// Contract owner (deployer)
    owner: Var<Address>,
    
    /// Authorized issuers (address => is_active)
    issuers: Mapping<Address, bool>,
    
    /// user_address → Credential
    credentials: Mapping<Address, Credential>,
}

#[odra::module]
impl CasperCred {
    /// Initialize contract - deployer becomes owner and first issuer
    /// This is called automatically by Odra during deployment
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.owner.set(caller);
        self.issuers.set(&caller, true);
    }

    // ---------------- OWNER FUNCTIONS ----------------

    /// Add a new issuer (owner only)
    pub fn add_issuer(&mut self, issuer: Address) {
        self.ensure_owner();
        
        if self.issuers.get(&issuer).unwrap_or(false) {
            self.env().revert(Error::AlreadyIssuer);
        }
        
        self.issuers.set(&issuer, true);
        
        self.env().emit_event(IssuerAdded {
            issuer,
            added_by: self.env().caller(),
        });
    }

    /// Remove an issuer (owner only)
    pub fn remove_issuer(&mut self, issuer: Address) {
        self.ensure_owner();
        
        if !self.issuers.get(&issuer).unwrap_or(false) {
            self.env().revert(Error::NotAnIssuer);
        }
        
        self.issuers.set(&issuer, false);
        
        self.env().emit_event(IssuerRemoved {
            issuer,
            removed_by: self.env().caller(),
        });
    }

    /// Transfer ownership (owner only)
    pub fn transfer_ownership(&mut self, new_owner: Address) {
        self.ensure_owner();
        self.owner.set(new_owner);
    }

    // ---------------- INTERNAL ----------------

    fn ensure_owner(&self) {
        let owner = self.owner.get().unwrap();
        if self.env().caller() != owner {
            self.env().revert(Error::NotOwner);
        }
    }

    fn ensure_issuer(&self) {
        let caller = self.env().caller();
        if !self.issuers.get(&caller).unwrap_or(false) {
            self.env().revert(Error::NotAuthorized);
        }
    }

    // ---------------- ISSUER ACTIONS ----------------

    /// Mint or re-issue a credential (any authorized issuer)
    pub fn mint(&mut self, user: Address, role: String, ttl_seconds: u64) {
        self.ensure_issuer();

        let now = self.env().get_block_time();
        let issuer = self.env().caller();

        let credential = Credential {
            role: role.clone(),
            issued_at: now,
            expires_at: now + ttl_seconds,
            revoked: false,
            issuer,
        };

        self.credentials.set(&user, credential);

        self.env().emit_event(CredentialIssued {
            user,
            role,
            expires_at: now + ttl_seconds,
            issuer,
        });
    }

    /// Revoke credential (any authorized issuer)
    pub fn revoke(&mut self, user: Address) {
        self.ensure_issuer();

        let mut credential = self
            .credentials
            .get(&user)
            .unwrap_or_else(|| self.env().revert(Error::NotIssued));

        credential.revoked = true;
        self.credentials.set(&user, credential);

        self.env().emit_event(CredentialRevoked { 
            user,
            issuer: self.env().caller(),
        });
    }

    // ---------------- READ ONLY ----------------

    /// Check if credential is valid (not revoked and not expired)
    pub fn is_valid(&self, user: Address) -> bool {
        match self.credentials.get(&user) {
            Some(c) => !c.revoked && self.env().get_block_time() < c.expires_at,
            None => false,
        }
    }

    /// Check if credential is revoked
    pub fn is_revoked(&self, user: Address) -> bool {
        match self.credentials.get(&user) {
            Some(c) => c.revoked,
            None => false,
        }
    }

    /// Get credential role
    pub fn get_role(&self, user: Address) -> Option<String> {
        self.credentials.get(&user).map(|c| c.role.clone())
    }

    /// Get credential expiry timestamp
    pub fn get_expiry(&self, user: Address) -> Option<u64> {
        self.credentials.get(&user).map(|c| c.expires_at)
    }

    /// Get contract owner
    pub fn get_owner(&self) -> Address {
        self.owner.get().unwrap()
    }

    /// Check if address is an authorized issuer
    pub fn is_issuer(&self, address: Address) -> bool {
        self.issuers.get(&address).unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_initialization() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        
        env.set_caller(owner);
        let contract = CasperCred::deploy(&env, NoArgs);
        
        assert_eq!(contract.get_owner(), owner);
        assert!(contract.is_issuer(owner));
    }

    #[test]
    fn test_multi_issuer() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let issuer2 = env.get_account(1);
        let user = env.get_account(2);
        
        env.set_caller(owner);
        let mut contract = CasperCred::deploy(&env, NoArgs);
        
        // Add second issuer
        contract.add_issuer(issuer2);
        assert!(contract.is_issuer(issuer2));
        
        // Second issuer can mint
        env.set_caller(issuer2);
        contract.mint(user, "developer".into(), 3600);
        
        assert!(contract.is_valid(user));
        assert_eq!(contract.get_role(user), Some("developer".into()));
    }
}