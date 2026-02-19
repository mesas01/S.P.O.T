#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_constructor() {
    let e = Env::default();
    let owner = Address::generate(&e);

    let event_name = String::from_str(&e, "Hackathon Stellar 2024");
    let event_date = 1735689600u64; // Example timestamp
    let location = String::from_str(&e, "Bogotá, Colombia");
    let description = String::from_str(&e, "Annual Stellar Hackathon");
    let max_nfts = 100u32;
    let claim_start = 1735689600u64;
    let claim_end = 1736294400u64; // 1 week later
    let metadata_uri = String::from_str(&e, "https://example.com/metadata.json");
    let image_url = String::from_str(&e, "https://example.com/image.png");

    SpotEvent::__constructor(
        &e,
        owner.clone(),
        event_name.clone(),
        event_date,
        location.clone(),
        description.clone(),
        max_nfts,
        claim_start,
        claim_end,
        metadata_uri.clone(),
        image_url.clone(),
    );

    let stored_owner = SpotEvent::owner(&e).unwrap();
    assert_eq!(stored_owner, owner);

    let (name, date, loc, desc, max, minted, start, end, uri, img) = SpotEvent::get_event_info(&e);
    assert_eq!(name, event_name);
    assert_eq!(date, event_date);
    assert_eq!(loc, location);
    assert_eq!(max, max_nfts);
    assert_eq!(minted, 0);
}

#[test]
fn test_mint() {
    let e = Env::default();
    let owner = Address::generate(&e);
    let recipient = Address::generate(&e);

    let event_name = String::from_str(&e, "Test Event");
    let event_date = 1735689600u64;
    let location = String::from_str(&e, "Test Location");
    let description = String::from_str(&e, "Test Description");
    let max_nfts = 10u32;
    let claim_start = 0u64; // Start immediately for testing
    let claim_end = u64::MAX; // Never end for testing
    let metadata_uri = String::from_str(&e, "https://example.com/metadata.json");
    let image_url = String::from_str(&e, "https://example.com/image.png");

    SpotEvent::__constructor(
        &e,
        owner.clone(),
        event_name,
        event_date,
        location,
        description,
        max_nfts,
        claim_start,
        claim_end,
        metadata_uri,
        image_url,
    );

    // Test mint
    let token_id = SpotEvent::mint(&e, recipient.clone()).unwrap();
    assert_eq!(token_id, 0);

    // Check has_minted
    assert!(SpotEvent::has_minted(&e, recipient.clone()));
    assert!(!SpotEvent::has_minted(&e, Address::generate(&e)));

    // Test duplicate mint should fail
    let result = SpotEvent::mint(&e, recipient.clone());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), SpotEventError::AlreadyMinted);
}

#[test]
fn test_limit_exceeded() {
    let e = Env::default();
    let owner = Address::generate(&e);

    let event_name = String::from_str(&e, "Test Event");
    let event_date = 1735689600u64;
    let location = String::from_str(&e, "Test Location");
    let description = String::from_str(&e, "Test Description");
    let max_nfts = 2u32; // Limit to 2 NFTs
    let claim_start = 0u64;
    let claim_end = u64::MAX;
    let metadata_uri = String::from_str(&e, "https://example.com/metadata.json");
    let image_url = String::from_str(&e, "https://example.com/image.png");

    SpotEvent::__constructor(
        &e,
        owner.clone(),
        event_name,
        event_date,
        location,
        description,
        max_nfts,
        claim_start,
        claim_end,
        metadata_uri,
        image_url,
    );

    // Mint 2 NFTs
    let recipient1 = Address::generate(&e);
    let recipient2 = Address::generate(&e);
    SpotEvent::mint(&e, recipient1).unwrap();
    SpotEvent::mint(&e, recipient2).unwrap();

    // Third mint should fail
    let recipient3 = Address::generate(&e);
    let result = SpotEvent::mint(&e, recipient3);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), SpotEventError::LimitExceeded);
}

