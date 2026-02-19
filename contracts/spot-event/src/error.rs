use soroban_sdk::{contracterror, symbol_short, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SpotEventError {
    /// Unauthorized: Only authorized roles can perform this action
    Unauthorized = 1,
    /// Already minted: User already has this SPOT
    AlreadyMinted = 2,
    /// Limit exceeded: Maximum NFTs limit reached
    LimitExceeded = 3,
    /// Claim period ended: Claim period has expired
    ClaimPeriodEnded = 4,
    /// Claim period not started: Claim period has not started yet
    ClaimPeriodNotStarted = 5,
    /// Invalid parameters: Invalid input parameters
    InvalidParameters = 6,
    /// Role not found: Role does not exist
    RoleNotFound = 7,
}

impl SpotEventError {
    pub fn to_symbol(&self) -> Symbol {
        match self {
            SpotEventError::Unauthorized => symbol_short!("UNAUTH"),
            SpotEventError::AlreadyMinted => symbol_short!("MINTED"),
            SpotEventError::LimitExceeded => symbol_short!("LIMIT_EX"),
            SpotEventError::ClaimPeriodEnded => symbol_short!("CLAIM_END"),
            SpotEventError::ClaimPeriodNotStarted => symbol_short!("NOT_START"),
            SpotEventError::InvalidParameters => symbol_short!("INV_PARAM"),
            SpotEventError::RoleNotFound => symbol_short!("NO_ROLE"),
        }
    }
}

