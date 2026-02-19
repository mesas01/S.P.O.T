use soroban_sdk::{contracterror, symbol_short, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SpotError {
    /// Unauthorized: Only authorized roles can perform this action
    Unauthorized = 1,
    /// Already claimed: User already claimed SPOT for this event
    AlreadyClaimed = 2,
    /// Limit exceeded: Maximum SPOT supply limit reached for this event
    LimitExceeded = 3,
    /// Claim period ended: Claim period has expired
    ClaimPeriodEnded = 4,
    /// Claim period not started: Claim period has not started yet
    ClaimPeriodNotStarted = 5,
    /// Invalid parameters: Invalid input parameters
    InvalidParameters = 6,
    /// Event not found: Event does not exist
    EventNotFound = 7,
    /// Event already exists: Event with this ID already exists
    EventAlreadyExists = 8,
    /// Creator is missing backend approval metadata
    CreatorNotApproved = 9,
}

impl SpotError {
    pub fn to_symbol(&self) -> Symbol {
        match self {
            SpotError::Unauthorized => symbol_short!("UNAUTH"),
            SpotError::AlreadyClaimed => symbol_short!("CLAIMED"),
            SpotError::LimitExceeded => symbol_short!("LIMIT_EX"),
            SpotError::ClaimPeriodEnded => symbol_short!("CLAIM_END"),
            SpotError::ClaimPeriodNotStarted => symbol_short!("NOT_START"),
            SpotError::InvalidParameters => symbol_short!("INV_PARAM"),
            SpotError::EventNotFound => symbol_short!("NO_EVENT"),
            SpotError::EventAlreadyExists => symbol_short!("EVT_EXST"),
            SpotError::CreatorNotApproved => symbol_short!("CRT_APPR"),
        }
    }
}

