//! SPOT Event Contract
//!
//! This contract manages SPOT (Stellar Proof of Togetherness) NFTs for a specific event.
//! It handles minting, burning, role-based access control, and claim period validation.

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::{default_impl, only_role};
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable,
    enumerable::{Enumerable, NonFungibleEnumerable},
    Base, NonFungibleToken,
};

use crate::error::SpotEventError;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Owner,              // Event owner/creator
    EventName,          // Name of the event
    EventDate,          // Date of the event (timestamp)
    Location,           // Location of the event
    Description,        // Event description
    MaxNfts,            // Maximum number of NFTs that can be minted
    MintedCount,        // Current count of minted NFTs
    ClaimStart,         // Claim period start timestamp
    ClaimEnd,           // Claim period end timestamp
    MetadataUri,        // URI pointing to event metadata JSON
    ImageUrl,           // URL of the event image
    HasMinted(Address), // Track if an address has already minted (prevents duplicates)
}

#[contract]
pub struct SpotEvent;

#[contractimpl]
impl SpotEvent {
    /// Constructor: Initialize the event contract
    /// 
    /// # Arguments
    /// * `owner` - Address of the event owner/creator
    /// * `event_name` - Name of the event
    /// * `event_date` - Date of the event (Unix timestamp)
    /// * `location` - Location of the event
    /// * `description` - Event description
    /// * `max_nfts` - Maximum number of NFTs that can be minted
    /// * `claim_start` - Claim period start timestamp
    /// * `claim_end` - Claim period end timestamp
    /// * `metadata_uri` - URI pointing to event metadata JSON
    /// * `image_url` - URL of the event image
    pub fn __constructor(
        e: &Env,
        owner: Address,
        event_name: String,
        event_date: u64,
        location: String,
        description: String,
        max_nfts: u32,
        claim_start: u64,
        claim_end: u64,
        metadata_uri: String,
        image_url: String,
    ) {
        owner.require_auth();

        // Validate parameters
        if max_nfts == 0 {
            panic!("max_nfts must be greater than 0");
        }
        if claim_end < claim_start {
            panic!("claim_end must be after claim_start");
        }

        // Set owner and initialize access control
        e.storage().instance().set(&DataKey::Owner, &owner);
        access_control::set_admin(e, &owner);

        // Store event information
        e.storage().instance().set(&DataKey::EventName, &event_name);
        e.storage().instance().set(&DataKey::EventDate, &event_date);
        e.storage().instance().set(&DataKey::Location, &location);
        e.storage().instance().set(&DataKey::Description, &description);
        e.storage().instance().set(&DataKey::MaxNfts, &max_nfts);
        e.storage().instance().set(&DataKey::MintedCount, &0u32);
        e.storage().instance().set(&DataKey::ClaimStart, &claim_start);
        e.storage().instance().set(&DataKey::ClaimEnd, &claim_end);
        e.storage().instance().set(&DataKey::MetadataUri, &metadata_uri);
        e.storage().instance().set(&DataKey::ImageUrl, &image_url);

        // Set NFT metadata
        Base::set_metadata(
            e,
            metadata_uri.clone(),
            event_name.clone(),
            String::from_str(e, "SPOT"), // Symbol
        );
    }

    /// Get the owner address
    pub fn owner(e: &Env) -> Result<Address, SpotEventError> {
        e.storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(SpotEventError::Unauthorized)
    }

    /// Mint a SPOT NFT to an address
    /// 
    /// # Arguments
    /// * `to` - Address that will receive the SPOT NFT
    /// 
    /// # Returns
    /// The token ID of the minted NFT
    pub fn mint(e: &Env, to: Address) -> Result<u32, SpotEventError> {
        // Check if claim period is active
        let current_time = e.ledger().timestamp();
        let claim_start: u64 = e.storage().instance().get(&DataKey::ClaimStart)
            .expect("claim_start should be set");
        let claim_end: u64 = e.storage().instance().get(&DataKey::ClaimEnd)
            .expect("claim_end should be set");

        if current_time < claim_start {
            return Err(SpotEventError::ClaimPeriodNotStarted);
        }
        if current_time > claim_end {
            return Err(SpotEventError::ClaimPeriodEnded);
        }

        // Check if address has already minted (prevent duplicates)
        if e.storage().instance().has(&DataKey::HasMinted(to.clone())) {
            return Err(SpotEventError::AlreadyMinted);
        }

        // Check if limit is exceeded
        let minted: u32 = e.storage().instance().get(&DataKey::MintedCount)
            .expect("minted_count should be set");
        let max_nfts: u32 = e.storage().instance().get(&DataKey::MaxNfts)
            .expect("max_nfts should be set");

        if minted >= max_nfts {
            return Err(SpotEventError::LimitExceeded);
        }

        // Mint the NFT
        let token_id = Enumerable::sequential_mint(e, &to);

        // Update counters and tracking
        e.storage().instance().set(&DataKey::MintedCount, &(minted + 1));
        e.storage().instance().set(&DataKey::HasMinted(to.clone()), &true);

        Ok(token_id)
    }

    /// Mint a SPOT NFT (only authorized roles can call this)
    /// This is a wrapper for mint() that requires authorization
    pub fn mint_authorized(e: &Env, to: Address, operator: Address) -> Result<u32, SpotEventError> {
        // Verify operator has minter role or is owner/admin
        Self::require_minter_or_admin(e, &operator)?;
        
        Self::mint(e, to)
    }

    /// Check if an address has minted
    pub fn has_minted(e: &Env, address: Address) -> bool {
        e.storage().instance().has(&DataKey::HasMinted(address))
    }

    /// Get event information
    pub fn get_event_info(e: &Env) -> (String, u64, String, String, u32, u32, u64, u64, String, String) {
        (
            e.storage().instance().get(&DataKey::EventName).expect("event_name should be set"),
            e.storage().instance().get(&DataKey::EventDate).expect("event_date should be set"),
            e.storage().instance().get(&DataKey::Location).expect("location should be set"),
            e.storage().instance().get(&DataKey::Description).expect("description should be set"),
            e.storage().instance().get(&DataKey::MaxNfts).expect("max_nfts should be set"),
            e.storage().instance().get(&DataKey::MintedCount).expect("minted_count should be set"),
            e.storage().instance().get(&DataKey::ClaimStart).expect("claim_start should be set"),
            e.storage().instance().get(&DataKey::ClaimEnd).expect("claim_end should be set"),
            e.storage().instance().get(&DataKey::MetadataUri).expect("metadata_uri should be set"),
            e.storage().instance().get(&DataKey::ImageUrl).expect("image_url should be set"),
        )
    }

    /// Burn unclaimed NFTs (only owner or admin can call)
    /// This burns all NFTs that haven't been minted after the claim period ends
    pub fn burn_unclaimed(e: &Env, operator: Address) -> Result<u32, SpotEventError> {
        Self::require_owner_or_admin(e, &operator)?;

        let current_time = e.ledger().timestamp();
        let claim_end: u64 = e.storage().instance().get(&DataKey::ClaimEnd)
            .expect("claim_end should be set");

        if current_time <= claim_end {
            return Err(SpotEventError::ClaimPeriodNotStarted);
        }

        let minted: u32 = e.storage().instance().get(&DataKey::MintedCount)
            .expect("minted_count should be set");
        let max_nfts: u32 = e.storage().instance().get(&DataKey::MaxNfts)
            .expect("max_nfts should be set");

        let unclaimed = max_nfts.saturating_sub(minted);
        
        // Update max_nfts to current minted count (effectively burning unclaimed)
        e.storage().instance().set(&DataKey::MaxNfts, &minted);

        Ok(unclaimed)
    }

    /// Grant minter role to an address
    pub fn grant_minter_role(e: &Env, minter: Address, operator: Address) -> Result<(), SpotEventError> {
        Self::require_owner_or_admin(e, &operator)?;
        access_control::grant_role(e, &operator, &minter, &symbol_short!("minter"));
        Ok(())
    }

    /// Revoke minter role from an address
    pub fn revoke_minter_role(e: &Env, minter: Address, operator: Address) -> Result<(), SpotEventError> {
        Self::require_owner_or_admin(e, &operator)?;
        access_control::revoke_role(e, &operator, &minter, &symbol_short!("minter"));
        Ok(())
    }

    /// Grant admin role to an address
    pub fn grant_admin_role(e: &Env, admin: Address, operator: Address) -> Result<(), SpotEventError> {
        let owner = Self::owner(e)?;
        owner.require_auth();
        access_control::grant_role(e, &operator, &admin, &symbol_short!("admin"));
        Ok(())
    }

    // Helper functions for role checking
    fn require_owner_or_admin(e: &Env, address: &Address) -> Result<(), SpotEventError> {
        let owner = Self::owner(e)?;
        if *address == owner {
            return Ok(());
        }
        
        if access_control::has_role(e, address, &symbol_short!("admin")).is_some() {
            return Ok(());
        }
        
        Err(SpotEventError::Unauthorized)
    }

    fn require_minter_or_admin(e: &Env, address: &Address) -> Result<(), SpotEventError> {
        let owner = Self::owner(e)?;
        if *address == owner {
            return Ok(());
        }
        
        if access_control::has_role(e, address, &symbol_short!("admin")).is_some() {
            return Ok(());
        }
        
        if access_control::has_role(e, address, &symbol_short!("minter")).is_some() {
            return Ok(());
        }
        
        Err(SpotEventError::Unauthorized)
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for SpotEvent {
    type ContractType = Enumerable;
}

#[default_impl]
#[contractimpl]
impl NonFungibleEnumerable for SpotEvent {}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for SpotEvent {}

#[default_impl]
#[contractimpl]
impl AccessControl for SpotEvent {}

