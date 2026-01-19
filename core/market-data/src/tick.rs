//! Tick data processing
//!
//! Handles real-time tick data with high-performance processing.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

use crate::{MarketDataError, Result};

/// A single tick representing a trade or quote update
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tick {
    /// Symbol identifier (e.g., "000001.SZ")
    pub symbol: String,
    /// Tick timestamp in UTC
    pub timestamp: DateTime<Utc>,
    /// Last trade price
    pub price: f64,
    /// Trade volume (0 for quote-only ticks)
    pub volume: f64,
    /// Trade turnover (price * volume)
    pub turnover: f64,
    /// Best bid price
    pub bid: f64,
    /// Best ask price
    pub ask: f64,
    /// Bid volume
    pub bid_volume: f64,
    /// Ask volume
    pub ask_volume: f64,
}

impl Tick {
    /// Create a new tick with validation
    pub fn new(
        symbol: String,
        timestamp: DateTime<Utc>,
        price: f64,
        volume: f64,
        bid: f64,
        ask: f64,
    ) -> Result<Self> {
        if symbol.is_empty() {
            return Err(MarketDataError::InvalidSymbol("empty symbol".to_string()));
        }
        if price <= 0.0 {
            return Err(MarketDataError::InvalidPrice(price));
        }
        if volume < 0.0 {
            return Err(MarketDataError::InvalidVolume(volume));
        }

        Ok(Self {
            symbol,
            timestamp,
            price,
            volume,
            turnover: price * volume,
            bid,
            ask,
            bid_volume: 0.0,
            ask_volume: 0.0,
        })
    }

    /// Calculate mid price
    #[inline]
    pub fn mid_price(&self) -> f64 {
        (self.bid + self.ask) / 2.0
    }

    /// Calculate spread
    #[inline]
    pub fn spread(&self) -> f64 {
        self.ask - self.bid
    }

    /// Calculate spread in basis points
    #[inline]
    pub fn spread_bps(&self) -> f64 {
        if self.mid_price() == 0.0 {
            return 0.0;
        }
        (self.spread() / self.mid_price()) * 10000.0
    }
}

/// High-performance tick buffer with ring buffer semantics
pub struct TickBuffer {
    /// Maximum capacity
    capacity: usize,
    /// Internal ring buffer
    buffer: VecDeque<Tick>,
}

impl TickBuffer {
    /// Create a new tick buffer with specified capacity
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            buffer: VecDeque::with_capacity(capacity),
        }
    }

    /// Push a new tick, evicting oldest if at capacity
    pub fn push(&mut self, tick: Tick) {
        if self.buffer.len() >= self.capacity {
            self.buffer.pop_front();
        }
        self.buffer.push_back(tick);
    }

    /// Get the latest tick
    pub fn latest(&self) -> Option<&Tick> {
        self.buffer.back()
    }

    /// Get number of ticks in buffer
    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    /// Get VWAP (Volume Weighted Average Price) for all ticks in buffer
    pub fn vwap(&self) -> Option<f64> {
        if self.buffer.is_empty() {
            return None;
        }

        let (total_turnover, total_volume) = self
            .buffer
            .iter()
            .filter(|t| t.volume > 0.0)
            .fold((0.0, 0.0), |(turnover, vol), tick| {
                (turnover + tick.turnover, vol + tick.volume)
            });

        if total_volume == 0.0 {
            return None;
        }

        Some(total_turnover / total_volume)
    }

    /// Get ticks within a time window
    pub fn ticks_since(&self, since: DateTime<Utc>) -> Vec<&Tick> {
        self.buffer
            .iter()
            .filter(|t| t.timestamp >= since)
            .collect()
    }

    /// Clear all ticks
    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn make_tick(symbol: &str, price: f64, volume: f64, secs: i64) -> Tick {
        Tick::new(
            symbol.to_string(),
            Utc.timestamp_opt(secs, 0).unwrap(),
            price,
            volume,
            price - 0.01,
            price + 0.01,
        )
        .unwrap()
    }

    #[test]
    fn test_tick_creation() {
        let tick = make_tick("000001.SZ", 10.50, 1000.0, 1000);
        assert_eq!(tick.symbol, "000001.SZ");
        assert_eq!(tick.price, 10.50);
        assert_eq!(tick.volume, 1000.0);
        assert_eq!(tick.turnover, 10500.0);
    }

    #[test]
    fn test_tick_validation() {
        // Empty symbol
        assert!(Tick::new(
            "".to_string(),
            Utc::now(),
            10.0,
            100.0,
            9.99,
            10.01
        )
        .is_err());

        // Invalid price
        assert!(Tick::new(
            "TEST".to_string(),
            Utc::now(),
            -1.0,
            100.0,
            9.99,
            10.01
        )
        .is_err());

        // Invalid volume
        assert!(Tick::new(
            "TEST".to_string(),
            Utc::now(),
            10.0,
            -100.0,
            9.99,
            10.01
        )
        .is_err());
    }

    #[test]
    fn test_spread_calculations() {
        let tick = make_tick("TEST", 10.0, 100.0, 1000);
        assert!((tick.spread() - 0.02).abs() < 1e-10);
        assert!((tick.mid_price() - 10.0).abs() < 1e-10);
    }

    #[test]
    fn test_tick_buffer() {
        let mut buffer = TickBuffer::new(3);
        assert!(buffer.is_empty());

        buffer.push(make_tick("TEST", 10.0, 100.0, 1));
        buffer.push(make_tick("TEST", 10.5, 200.0, 2));
        buffer.push(make_tick("TEST", 11.0, 150.0, 3));

        assert_eq!(buffer.len(), 3);
        assert_eq!(buffer.latest().unwrap().price, 11.0);

        // Test eviction
        buffer.push(make_tick("TEST", 11.5, 100.0, 4));
        assert_eq!(buffer.len(), 3);
        assert_eq!(buffer.latest().unwrap().price, 11.5);
    }

    #[test]
    fn test_vwap() {
        let mut buffer = TickBuffer::new(10);
        buffer.push(make_tick("TEST", 10.0, 100.0, 1)); // turnover = 1000
        buffer.push(make_tick("TEST", 20.0, 100.0, 2)); // turnover = 2000
        // Total turnover = 3000, total volume = 200
        // VWAP = 3000 / 200 = 15.0
        assert!((buffer.vwap().unwrap() - 15.0).abs() < 1e-10);
    }
}
