use soroban_sdk::{contracterror, symbol_short, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PoapError {
    /// Unauthorized: Only authorized roles can perform this action
    Unauthorized = 1,
    /// Already claimed: User already claimed POAP for this event
    AlreadyClaimed = 2,
    /// Limit exceeded: Maximum POAPs limit reached for this event
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

impl PoapError {
    pub fn to_symbol(&self) -> Symbol {
        match self {
            PoapError::Unauthorized => symbol_short!("UNAUTH"),
            PoapError::AlreadyClaimed => symbol_short!("CLAIMED"),
            PoapError::LimitExceeded => symbol_short!("LIMIT_EX"),
            PoapError::ClaimPeriodEnded => symbol_short!("CLAIM_END"),
            PoapError::ClaimPeriodNotStarted => symbol_short!("NOT_START"),
            PoapError::InvalidParameters => symbol_short!("INV_PARAM"),
            PoapError::EventNotFound => symbol_short!("NO_EVENT"),
            PoapError::EventAlreadyExists => symbol_short!("EVT_EXST"),
            PoapError::CreatorNotApproved => symbol_short!("CRT_APPR"),
        }
    }
}

