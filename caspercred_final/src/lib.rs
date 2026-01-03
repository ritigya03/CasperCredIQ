#![cfg_attr(not(test), no_std)]

extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;

use odra::prelude::*;
use odra::casper_types::{
    bytesrepr::{FromBytes, ToBytes, Error as BytesError},
    CLType, CLTyped,
};

/// =======================================================
/// Credential stored on-chain
/// =======================================================

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Credential {
    pub role: String,
    pub issued_at: u64,
    pub expires_at: u64,
    pub revoked: bool,
}

impl CLTyped for Credential {
    fn cl_type() -> CLType {
        // Stored only internally in Mapping
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
        Ok(bytes)
    }

    fn serialized_length(&self) -> usize {
        self.role.serialized_length()
            + self.issued_at.serialized_length()
            + self.expires_at.serialized_length()
            + self.revoked.serialized_length()
    }
}

impl FromBytes for Credential {
    fn from_bytes(bytes: &[u8]) -> Result<(Self, &[u8]), BytesError> {
        let (role, rem) = String::from_bytes(bytes)?;
        let (issued_at, rem) = u64::from_bytes(rem)?;
        let (expires_at, rem) = u64::from_bytes(rem)?;
        let (revoked, rem) = bool::from_bytes(rem)?;

        Ok((
            Credential {
                role,
                issued_at,
                expires_at,
                revoked,
            },
            rem,
        ))
    }
}

/// =======================================================
/// Events
/// =======================================================

#[odra::event]
pub struct CredentialIssued {
    pub user: Address,
    pub role: String,
    pub expires_at: u64,
}

#[odra::event]
pub struct CredentialRevoked {
    pub user: Address,
}

/// =======================================================
/// Errors
/// =======================================================

#[odra::odra_error]
pub enum Error {
    NotIssuer = 1,
    NotIssued = 2,
    IssuerNotInitialized = 3,
}

/// =======================================================
/// Smart Contract
/// =======================================================

#[odra::module]
pub struct CasperCred {
    /// Single trusted issuer (set at deploy)
    issuer: Var<Address>,

    /// user_address → Credential
    credentials: Mapping<Address, Credential>,
}

#[odra::module]
impl CasperCred {
    /// Called ONCE at deployment
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.issuer.set(caller);
    }

    // ---------------- INTERNAL ----------------

    fn ensure_issuer(&self) {
        let issuer = self
            .issuer
            .get()
            .unwrap_or_else(|| self.env().revert(Error::IssuerNotInitialized));

        if self.env().caller() != issuer {
            self.env().revert(Error::NotIssuer);
        }
    }

    // ---------------- ISSUER ACTIONS ----------------

    /// Mint or re-issue a credential
    pub fn mint(&mut self, user: Address, role: String, ttl_seconds: u64) {
        self.ensure_issuer();

        let now = self.env().get_block_time();

        let credential = Credential {
            role: role.clone(),
            issued_at: now,
            expires_at: now + ttl_seconds,
            revoked: false,
        };

        self.credentials.set(&user, credential);

        self.env().emit_event(CredentialIssued {
            user,
            role,
            expires_at: now + ttl_seconds,
        });
    }

    /// Revoke credential
    pub fn revoke(&mut self, user: Address) {
        self.ensure_issuer();

        let mut credential = self
            .credentials
            .get(&user)
            .unwrap_or_else(|| self.env().revert(Error::NotIssued));

        credential.revoked = true;
        self.credentials.set(&user, credential);

        self.env().emit_event(CredentialRevoked { user });
    }

    // ---------------- READ ONLY ----------------

    pub fn is_valid(&self, user: Address) -> bool {
        match self.credentials.get(&user) {
            Some(c) => !c.revoked && self.env().get_block_time() < c.expires_at,
            None => false,
        }
    }

    pub fn get_role(&self, user: Address) -> Option<String> {
        self.credentials.get(&user).map(|c| c.role.clone())
    }

    pub fn get_issuer(&self) -> Address {
        self.issuer
            .get()
            .unwrap_or_else(|| self.env().revert(Error::IssuerNotInitialized))
    }
}
