#![no_std]

mod contract;
mod error;

pub use contract::CreatorApproval;
pub use contract::EventData;
pub use contract::Spot;
pub use error::SpotError;

#[cfg(test)]
mod test;

