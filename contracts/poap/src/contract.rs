//! SPOT Contract
//!
//! This contract manages SPOT (Stellar Proof of Attendance Token) NFTs for multiple events.
//! It handles event creation, minting, burning, role-based access control, and claim period validation.
//! All events are managed in a single contract instance.

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::default_impl;
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable,
    enumerable::{Enumerable, NonFungibleEnumerable},
    Base, NonFungibleToken,
};

use crate::error::SpotError;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    EventCounter,                  // Counter for event IDs
    EventInfo(u32),                // Event information (EventData)
    EventMintedCount(u32),         // Number of SPOT badges minted for an event
    HasClaimed(u32, Address),      // Track if an address has claimed a SPOT badge for an event
    EventTokenId(u32, u32),        // Map event_id + token_index to token_id
    UserEventTokenId(u32, Address), // Map event_id + address to token_id (for efficient lookup)
    CreatorApproval(Address),      // Tracks off-chain payment approval for creators
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventData {
    pub event_id: u32,
    pub creator: Address,
    pub event_name: String,
    pub event_date: u64,
    pub location: String,
    pub description: String,
    pub max_poaps: u32,
    pub claim_start: u64,
    pub claim_end: u64,
    pub metadata_uri: String,
    pub image_url: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreatorApproval {
    pub payment_reference: String,
    pub approved_at: u64,
    pub approved_by: Address,
}

#[contract]
pub struct Spot;

#[contractimpl]
impl Spot {
/// Constructor: Initialize the SPOT contract
    /// 
    /// # Arguments
    /// * `admin` - Address of the contract admin
    pub fn __constructor(e: &Env, admin: Address) {
        // Set NFT metadata for the contract first
        Base::set_metadata(
            e,
            String::from_str(e, "https://spot.example.com/metadata"),
            String::from_str(e, "SPOT"),
            String::from_str(e, "SPOT"),
        );

        // Initialize access control
        access_control::set_admin(e, &admin);

        // Initialize event counter
        e.storage().instance().set(&DataKey::EventCounter, &0u32);
    }

    /// Get the admin address
    pub fn admin(e: &Env) -> Result<Address, SpotError> {
        access_control::get_admin(e).ok_or(SpotError::Unauthorized)
    }

    /// Create a new SPOT event
    /// 
    /// # Arguments
    /// * `creator` - Address creating the event (must be authorized)
    /// * `event_name` - Name of the event
    /// * `event_date` - Date of the event (Unix timestamp)
    /// * `location` - Location of the event
    /// * `description` - Event description
    /// * `max_poaps` - Maximum number of SPOT badges that can be minted
    /// * `claim_start` - Claim period start timestamp
    /// * `claim_end` - Claim period end timestamp
    /// * `metadata_uri` - URI pointing to event metadata JSON
    /// * `image_url` - URL of the event image
    /// 
    /// # Returns
    /// The event ID of the newly created event
    pub fn create_event(
        e: &Env,
        creator: Address,
        event_name: String,
        event_date: u64,
        location: String,
        description: String,
        max_poaps: u32,
        claim_start: u64,
        claim_end: u64,
        metadata_uri: String,
        image_url: String,
    ) -> Result<u32, SpotError> {
        creator.require_auth();

        let is_admin = Self::is_admin_address(e, &creator)?;
        if !is_admin && !Self::has_creator_approval(e, &creator) {
            return Err(SpotError::CreatorNotApproved);
        }

        // Verify creator is authorized (admin or has creator role)
        Self::require_admin_or_creator(e, &creator)?;

        // Validate parameters
        if max_poaps == 0 {
            return Err(SpotError::InvalidParameters);
        }
        if claim_end < claim_start {
            return Err(SpotError::InvalidParameters);
        }

        // Get and increment event counter
        let event_counter: u32 = e.storage().instance().get(&DataKey::EventCounter)
            .unwrap_or(0u32);
        let event_id = event_counter + 1;

        // Check if event already exists (shouldn't happen, but safety check)
        if e.storage().instance().has(&DataKey::EventInfo(event_id)) {
            return Err(SpotError::EventAlreadyExists);
        }

        // Create event data
        let event_data = EventData {
            event_id,
            creator: creator.clone(),
            event_name: event_name.clone(),
            event_date,
            location: location.clone(),
            description: description.clone(),
            max_poaps,
            claim_start,
            claim_end,
            metadata_uri: metadata_uri.clone(),
            image_url: image_url.clone(),
        };

        // Store event information
        e.storage().instance().set(&DataKey::EventInfo(event_id), &event_data);
        e.storage().instance().set(&DataKey::EventMintedCount(event_id), &0u32);
        e.storage().instance().set(&DataKey::EventCounter, &event_id);

        Ok(event_id)
    }

    /// Approve a creator after receiving an off-chain payment.
    /// Grants the creator role and stores payment metadata for audits.
    pub fn approve_creator(
        e: &Env,
        operator: Address,
        creator: Address,
        payment_reference: String,
    ) -> Result<(), SpotError> {
        Self::require_admin(e, &operator)?;
        access_control::grant_role(e, &operator, &creator, &symbol_short!("creator"));

        let approval = CreatorApproval {
            payment_reference,
            approved_at: e.ledger().timestamp(),
            approved_by: operator.clone(),
        };

        e.storage()
            .instance()
            .set(&DataKey::CreatorApproval(creator), &approval);

        Ok(())
    }

    /// Remove approval and creator role, e.g. when a refund is issued.
    pub fn revoke_creator_approval(
        e: &Env,
        operator: Address,
        creator: Address,
    ) -> Result<(), SpotError> {
        Self::require_admin(e, &operator)?;
        access_control::revoke_role(e, &operator, &creator, &symbol_short!("creator"));
        e.storage().instance().remove(&DataKey::CreatorApproval(creator));
        Ok(())
    }

    /// Retrieve payment approval metadata for a creator.
    pub fn get_creator_approval(e: &Env, creator: Address) -> Option<CreatorApproval> {
        e.storage().instance().get(&DataKey::CreatorApproval(creator))
    }

    /// Claim a SPOT badge for a specific event
    /// 
    /// # Arguments
    /// * `event_id` - ID of the event
    /// * `to` - Address that will receive the SPOT NFT
    /// 
    /// # Returns
    /// The token ID of the minted SPOT badge
    pub fn claim(e: &Env, event_id: u32, to: Address) -> Result<u32, SpotError> {
        // Get event information
        let event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;

        // Check if claim period is active
        let current_time = e.ledger().timestamp();
        if current_time < event_data.claim_start {
            return Err(SpotError::ClaimPeriodNotStarted);
        }
        if current_time > event_data.claim_end {
            return Err(SpotError::ClaimPeriodEnded);
        }

        // Check if address has already claimed (prevent duplicates)
        if e.storage().instance().has(&DataKey::HasClaimed(event_id, to.clone())) {
            return Err(SpotError::AlreadyClaimed);
        }

        // Check if limit is exceeded
        let minted: u32 = e.storage().instance().get(&DataKey::EventMintedCount(event_id))
            .unwrap_or(0u32);

        if minted >= event_data.max_poaps {
            return Err(SpotError::LimitExceeded);
        }

        // Mint the NFT
        let token_id = Enumerable::sequential_mint(e, &to);

        // Update counters and tracking
        e.storage().instance().set(&DataKey::EventMintedCount(event_id), &(minted + 1));
        e.storage().instance().set(&DataKey::HasClaimed(event_id, to.clone()), &true);
        e.storage().instance().set(&DataKey::EventTokenId(event_id, minted), &token_id);
        e.storage().instance().set(&DataKey::UserEventTokenId(event_id, to.clone()), &token_id);

        Ok(token_id)
    }

    /// Check if an address has claimed a SPOT badge for a specific event
    pub fn has_claimed(e: &Env, event_id: u32, address: Address) -> bool {
        e.storage().instance().has(&DataKey::HasClaimed(event_id, address))
    }

    /// Get event information
    pub fn get_event(e: &Env, event_id: u32) -> Result<EventData, SpotError> {
        e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)
    }

    /// Get the number of SPOT badges minted for an event
    pub fn minted_count(e: &Env, event_id: u32) -> Result<u32, SpotError> {
        // Verify event exists
        let _event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;
        
        Ok(e.storage().instance().get(&DataKey::EventMintedCount(event_id))
            .unwrap_or(0u32))
    }

    /// Get all event IDs (returns a vector of event IDs)
    pub fn get_all_events(e: &Env) -> Vec<u32> {
        let event_counter: u32 = e.storage().instance().get(&DataKey::EventCounter)
            .unwrap_or(0u32);
        
        let mut events = Vec::new(e);
        for i in 1..=event_counter {
            if e.storage().instance().has(&DataKey::EventInfo(i)) {
                events.push_back(i);
            }
        }
        events
    }

    /// Get the total number of events
    pub fn event_count(e: &Env) -> u32 {
        e.storage().instance().get(&DataKey::EventCounter)
            .unwrap_or(0u32)
    }

    /// Get the token ID for a specific event and token index
    /// 
    /// # Arguments
    /// * `event_id` - ID of the event
    /// * `token_index` - Index of the token (0-based, corresponds to minting order)
    /// 
    /// # Returns
    /// The token ID if it exists
    pub fn get_token_id_for_event(e: &Env, event_id: u32, token_index: u32) -> Result<u32, SpotError> {
        // Verify event exists
        let _event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;
        
        e.storage().instance().get(&DataKey::EventTokenId(event_id, token_index))
            .ok_or(SpotError::EventNotFound)
    }

    /// Get all token IDs minted for a specific event
    /// 
    /// # Arguments
    /// * `event_id` - ID of the event
    /// 
    /// # Returns
    /// A vector of all token IDs minted for the event
    pub fn get_event_poaps(e: &Env, event_id: u32) -> Result<Vec<u32>, SpotError> {
        // Verify event exists
        let _event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;
        
        let minted: u32 = e.storage().instance().get(&DataKey::EventMintedCount(event_id))
            .unwrap_or(0u32);
        
        let mut token_ids = Vec::new(e);
        for i in 0..minted {
            if let Some(token_id) = e.storage().instance().get(&DataKey::EventTokenId(event_id, i)) {
                token_ids.push_back(token_id);
            }
        }
        
        Ok(token_ids)
    }

    /// Get the token ID of a SPOT badge claimed by a specific address for an event
    /// 
    /// # Arguments
    /// * `event_id` - ID of the event
    /// * `address` - Address that claimed the SPOT badge
    /// 
    /// # Returns
    /// The token ID if the address has claimed a SPOT badge for this event
    pub fn get_user_poap_for_event(e: &Env, event_id: u32, address: Address) -> Result<u32, SpotError> {
        // Verify event exists
        let _event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;
        
        // Check if address has claimed
        if !e.storage().instance().has(&DataKey::HasClaimed(event_id, address.clone())) {
            return Err(SpotError::EventNotFound); // Address hasn't claimed
        }
        
        // Get token ID directly from the mapping
        e.storage().instance().get(&DataKey::UserEventTokenId(event_id, address))
            .ok_or(SpotError::EventNotFound)
    }

    /// Grant admin role to an address
    pub fn grant_admin_role(e: &Env, admin: Address, operator: Address) -> Result<(), SpotError> {
        let contract_admin = Self::admin(e)?;
        contract_admin.require_auth();
        access_control::grant_role(e, &operator, &admin, &symbol_short!("admin"));
        Ok(())
    }

    /// Update event information (only event creator or admin can update)
    pub fn update_event(
        e: &Env,
        operator: Address,
        event_id: u32,
        event_name: Option<String>,
        event_date: Option<u64>,
        location: Option<String>,
        description: Option<String>,
        metadata_uri: Option<String>,
        image_url: Option<String>,
    ) -> Result<(), SpotError> {
        let mut event_data: EventData = e.storage().instance().get(&DataKey::EventInfo(event_id))
            .ok_or(SpotError::EventNotFound)?;

        // Verify operator is event creator or admin
        if event_data.creator != operator {
            Self::require_admin(e, &operator)?;
        }

        // Update fields if provided
        if let Some(name) = event_name {
            event_data.event_name = name;
        }
        if let Some(date) = event_date {
            event_data.event_date = date;
        }
        if let Some(loc) = location {
            event_data.location = loc;
        }
        if let Some(desc) = description {
            event_data.description = desc;
        }
        if let Some(uri) = metadata_uri {
            event_data.metadata_uri = uri;
        }
        if let Some(img) = image_url {
            event_data.image_url = img;
        }

        // Save updated event data
        e.storage().instance().set(&DataKey::EventInfo(event_id), &event_data);

        Ok(())
    }

    // Helper functions for role checking
    fn require_admin(e: &Env, address: &Address) -> Result<(), SpotError> {
        if Self::is_admin_address(e, address)? {
            return Ok(());
        }
        
        Err(SpotError::Unauthorized)
    }

    fn require_admin_or_creator(e: &Env, address: &Address) -> Result<(), SpotError> {
        if Self::is_admin_address(e, address)? {
            return Ok(());
        }
        
        if access_control::has_role(e, address, &symbol_short!("admin")).is_some() {
            return Ok(());
        }
        
        if access_control::has_role(e, address, &symbol_short!("creator")).is_some() {
            return Ok(());
        }
        
        Err(SpotError::Unauthorized)
    }

    fn is_admin_address(e: &Env, address: &Address) -> Result<bool, SpotError> {
        let admin = Self::admin(e)?;
        if *address == admin {
            return Ok(true);
        }
        if access_control::has_role(e, address, &symbol_short!("admin")).is_some() {
            return Ok(true);
        }
        Ok(false)
    }

    fn has_creator_approval(e: &Env, creator: &Address) -> bool {
        e.storage().instance().has(&DataKey::CreatorApproval(creator.clone()))
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for Spot {
    type ContractType = Enumerable;
}

#[default_impl]
#[contractimpl]
impl NonFungibleEnumerable for Spot {}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for Spot {}

#[default_impl]
#[contractimpl]
impl AccessControl for Spot {}

