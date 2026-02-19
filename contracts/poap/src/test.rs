#![cfg(test)]

use super::*;
use crate::contract::SpotClient;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_client<'a>(e: &'a Env, admin: &Address) -> SpotClient<'a> {
    e.mock_all_auths();
    let address = e.register(Spot, (admin,));
    SpotClient::new(e, &address)
}

#[test]
fn test_constructor() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let stored_admin = client.admin();
    assert_eq!(stored_admin, admin);

    let event_count = client.event_count();
    assert_eq!(event_count, 0);
}

#[test]
fn test_create_event() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_name = String::from_str(&e, "Hackathon Stellar 2024");
    let event_date = 1735689600u64;
    let location = String::from_str(&e, "Bogotá, Colombia");
    let description = String::from_str(&e, "Annual Stellar Hackathon");
    let max_poaps = 100u32;
    let claim_start = 1735689600u64;
    let claim_end = 1736294400u64;
    let metadata_uri = String::from_str(&e, "https://example.com/metadata.json");
    let image_url = String::from_str(&e, "https://example.com/image.png");

    let event_id = client.create_event(
        &admin,
        &event_name,
        &event_date,
        &location,
        &description,
        &max_poaps,
        &claim_start,
        &claim_end,
        &metadata_uri,
        &image_url,
    );

    assert_eq!(event_id, 1);

    let event_data = client.get_event(&event_id);
    assert_eq!(event_data.event_id, 1);
    assert_eq!(event_data.event_name, event_name);
    assert_eq!(event_data.event_date, event_date);
    assert_eq!(event_data.location, location);
    assert_eq!(event_data.max_poaps, max_poaps);
    assert_eq!(event_data.creator, admin);

    let minted = client.minted_count(&event_id);
    assert_eq!(minted, 0);

    let event_count = client.event_count();
    assert_eq!(event_count, 1);
}

#[test]
fn test_create_multiple_events() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id1 = client.create_event(
        &admin,
        &String::from_str(&e, "Event 1"),
        &1735689600u64,
        &String::from_str(&e, "Location 1"),
        &String::from_str(&e, "Description 1"),
        &50u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata1.json"),
        &String::from_str(&e, "https://example.com/image1.png"),
    );

    let event_id2 = client.create_event(
        &admin,
        &String::from_str(&e, "Event 2"),
        &1735689600u64,
        &String::from_str(&e, "Location 2"),
        &String::from_str(&e, "Description 2"),
        &30u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata2.json"),
        &String::from_str(&e, "https://example.com/image2.png"),
    );

    assert_eq!(event_id1, 1);
    assert_eq!(event_id2, 2);

    let event_count = client.event_count();
    assert_eq!(event_count, 2);

    let event1 = client.get_event(&event_id1);
    let event2 = client.get_event(&event_id2);

    assert_eq!(event1.event_name, String::from_str(&e, "Event 1"));
    assert_eq!(event2.event_name, String::from_str(&e, "Event 2"));
}

#[test]
fn test_claim() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let recipient = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id = client.create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    let token_id = client.claim(&event_id, &recipient);
    assert_eq!(token_id, 0);

    assert!(client.has_claimed(&event_id, &recipient));
    assert!(!client.has_claimed(&event_id, &Address::generate(&e)));

    let minted = client.minted_count(&event_id);
    assert_eq!(minted, 1);

    let result = client.try_claim(&event_id, &recipient);
    assert_eq!(result.unwrap_err(), Ok(SpotError::AlreadyClaimed));
}

#[test]
fn test_has_claimed() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let recipient = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id = client.create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert!(!client.has_claimed(&event_id, &recipient));

    client.claim(&event_id, &recipient);

    assert!(client.has_claimed(&event_id, &recipient));
}

#[test]
fn test_minted_count() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id = client.create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    let minted = client.minted_count(&event_id);
    assert_eq!(minted, 0);

    let recipient1 = Address::generate(&e);
    let recipient2 = Address::generate(&e);

    client.claim(&event_id, &recipient1);
    let minted = client.minted_count(&event_id);
    assert_eq!(minted, 1);

    client.claim(&event_id, &recipient2);
    let minted = client.minted_count(&event_id);
    assert_eq!(minted, 2);
}

#[test]
fn test_limit_exceeded() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id = client.create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &2u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    let recipient1 = Address::generate(&e);
    let recipient2 = Address::generate(&e);
    client.claim(&event_id, &recipient1);
    client.claim(&event_id, &recipient2);

    let recipient3 = Address::generate(&e);
    let result = client.try_claim(&event_id, &recipient3);
    assert_eq!(result.unwrap_err(), Ok(SpotError::LimitExceeded));
}

#[test]
fn test_invalid_max_poaps() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let result = client.try_create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &0u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert_eq!(result.unwrap_err(), Ok(SpotError::InvalidParameters));
}

#[test]
fn test_invalid_claim_period() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let result = client.try_create_event(
        &admin,
        &String::from_str(&e, "Test Event"),
        &1735689600u64,
        &String::from_str(&e, "Test Location"),
        &String::from_str(&e, "Test Description"),
        &10u32,
        &100u64,
        &50u64,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert_eq!(result.unwrap_err(), Ok(SpotError::InvalidParameters));
}

#[test]
fn test_event_not_found() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let recipient = Address::generate(&e);
    let client = create_client(&e, &admin);

    let result = client.try_claim(&999, &recipient);
    assert_eq!(result.unwrap_err(), Ok(SpotError::EventNotFound));

    let result = client.try_get_event(&999);
    assert_eq!(result.unwrap_err(), Ok(SpotError::EventNotFound));
}

#[test]
fn test_get_all_events() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_id1 = client.create_event(
        &admin,
        &String::from_str(&e, "Event 1"),
        &1735689600u64,
        &String::from_str(&e, "Location 1"),
        &String::from_str(&e, "Description 1"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata1.json"),
        &String::from_str(&e, "https://example.com/image1.png"),
    );

    let event_id2 = client.create_event(
        &admin,
        &String::from_str(&e, "Event 2"),
        &1735689600u64,
        &String::from_str(&e, "Location 2"),
        &String::from_str(&e, "Description 2"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata2.json"),
        &String::from_str(&e, "https://example.com/image2.png"),
    );

    let all_events = client.get_all_events();
    assert_eq!(all_events.len(), 2);
    assert_eq!(all_events.get(0).unwrap(), event_id1);
    assert_eq!(all_events.get(1).unwrap(), event_id2);
}

#[test]
fn test_creator_requires_backend_approval() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let client = create_client(&e, &admin);

    let event_result = client.try_create_event(
        &creator,
        &String::from_str(&e, "Community Meetup"),
        &1735689600u64,
        &String::from_str(&e, "Buenos Aires"),
        &String::from_str(&e, "Monthly meetup"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert_eq!(event_result.unwrap_err(), Ok(SpotError::CreatorNotApproved));

    client.approve_creator(
        &admin,
        &creator,
        &String::from_str(&e, "invoice-123"),
    );

    let event_id = client.create_event(
        &creator,
        &String::from_str(&e, "Community Meetup"),
        &1735689600u64,
        &String::from_str(&e, "Buenos Aires"),
        &String::from_str(&e, "Monthly meetup"),
        &10u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert_eq!(event_id, 1);

    let approval = client.get_creator_approval(&creator).unwrap();
    assert_eq!(approval.payment_reference, String::from_str(&e, "invoice-123"));
    assert_eq!(approval.approved_by, admin);
}

#[test]
fn test_revoke_creator_approval_blocks_future_events() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let client = create_client(&e, &admin);

    client.approve_creator(
        &admin,
        &creator,
        &String::from_str(&e, "invoice-456"),
    );

    client.create_event(
        &creator,
        &String::from_str(&e, "First Event"),
        &1735689600u64,
        &String::from_str(&e, "Quito"),
        &String::from_str(&e, "Description"),
        &5u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    client.revoke_creator_approval(&admin, &creator);

    let result = client.try_create_event(
        &creator,
        &String::from_str(&e, "Second Event"),
        &1735689600u64,
        &String::from_str(&e, "Quito"),
        &String::from_str(&e, "Description"),
        &5u32,
        &0u64,
        &u64::MAX,
        &String::from_str(&e, "https://example.com/metadata.json"),
        &String::from_str(&e, "https://example.com/image.png"),
    );

    assert_eq!(result.unwrap_err(), Ok(SpotError::CreatorNotApproved));
}
