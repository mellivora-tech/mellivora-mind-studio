//! Market Data Engine
//!
//! High-performance market data processing for real-time tick data and OHLCV aggregation.
//! 
//! # Features
//! - Real-time tick processing with sub-millisecond latency
//! - OHLCV bar aggregation (1m, 5m, 15m, 30m, 60m, daily)
//! - Snapshot management for market state
//! - Symbol subscription management

pub mod tick;
pub mod ohlcv;
pub mod snapshot;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum MarketDataError {
    #[error("Invalid symbol: {0}")]
    InvalidSymbol(String),

    #[error("Invalid price: {0}")]
    InvalidPrice(f64),

    #[error("Invalid volume: {0}")]
    InvalidVolume(f64),

    #[error("Invalid timestamp: {0}")]
    InvalidTimestamp(i64),

    #[error("Symbol not subscribed: {0}")]
    NotSubscribed(String),

    #[error("Bar aggregation error: {0}")]
    AggregationError(String),

    #[error("Snapshot error: {0}")]
    SnapshotError(String),
}

pub type Result<T> = std::result::Result<T, MarketDataError>;
