#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec, symbol_short, Symbol};

mod contract;
mod error;

pub use contract::SpotFactory;
use error::SpotFactoryError;

#[cfg(test)]
mod test;

