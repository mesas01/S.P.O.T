#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, String};

#[test]
fn test_constructor() {
    let e = Env::default();
    let admin = Address::generate(&e);

    SpotFactory::__constructor(&e, admin.clone());
    
    let stored_admin = SpotFactory::admin(&e).unwrap();
    assert_eq!(stored_admin, admin);
}

#[test]
fn test_set_admin() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let new_admin = Address::generate(&e);

    SpotFactory::__constructor(&e, admin.clone());
    
    // Set new admin
    SpotFactory::set_admin(&e, new_admin.clone());
    
    let stored_admin = SpotFactory::admin(&e).unwrap();
    assert_eq!(stored_admin, new_admin);
}

#[test]
fn test_create_event() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);

    SpotFactory::__constructor(&e, admin.clone());

    let event_name = String::from_str(&e, "Hackathon Stellar 2024");
    let max_nfts = 100u32;
    let metadata_uri = String::from_str(&e, "https://example.com/metadata.json");

    // TODO: Implement actual contract deployment for full test
    // For now, this tests the basic structure
    let result = SpotFactory::create_event(
        &e,
        creator.clone(),
        event_name.clone(),
        max_nfts,
        metadata_uri.clone(),
    );

    assert!(result.is_ok());
}

