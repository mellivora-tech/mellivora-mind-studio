//! Market snapshot management
//!
//! Maintains current market state for all subscribed symbols.

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::tick::Tick;
use crate::Result;

/// Market snapshot for a single symbol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolSnapshot {
    /// Symbol identifier
    pub symbol: String,
    /// Last update timestamp
    pub timestamp: DateTime<Utc>,
    /// Last trade price
    pub last_price: f64,
    /// Today's opening price
    pub open: f64,
    /// Today's highest price
    pub high: f64,
    /// Today's lowest price
    pub low: f64,
    /// Previous close price
    pub prev_close: f64,
    /// Total volume
    pub volume: f64,
    /// Total turnover
    pub turnover: f64,
    /// Best bid price
    pub bid: f64,
    /// Best ask price
    pub ask: f64,
    /// Bid volume
    pub bid_volume: f64,
    /// Ask volume
    pub ask_volume: f64,
    /// Upper limit price (涨停价)
    pub upper_limit: f64,
    /// Lower limit price (跌停价)
    pub lower_limit: f64,
}

impl SymbolSnapshot {
    /// Create a new snapshot from a tick
    pub fn from_tick(tick: &Tick) -> Self {
        Self {
            symbol: tick.symbol.clone(),
            timestamp: tick.timestamp,
            last_price: tick.price,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            prev_close: 0.0,
            volume: tick.volume,
            turnover: tick.turnover,
            bid: tick.bid,
            ask: tick.ask,
            bid_volume: tick.bid_volume,
            ask_volume: tick.ask_volume,
            upper_limit: 0.0,
            lower_limit: 0.0,
        }
    }

    /// Update snapshot with a new tick
    pub fn update(&mut self, tick: &Tick) {
        self.timestamp = tick.timestamp;
        self.last_price = tick.price;
        self.high = self.high.max(tick.price);
        self.low = self.low.min(tick.price);
        self.volume += tick.volume;
        self.turnover += tick.turnover;
        self.bid = tick.bid;
        self.ask = tick.ask;
        self.bid_volume = tick.bid_volume;
        self.ask_volume = tick.ask_volume;
    }

    /// Calculate change from previous close
    pub fn change(&self) -> f64 {
        self.last_price - self.prev_close
    }

    /// Calculate change percentage from previous close
    pub fn change_pct(&self) -> f64 {
        if self.prev_close == 0.0 {
            return 0.0;
        }
        (self.change() / self.prev_close) * 100.0
    }

    /// Check if at upper limit (涨停)
    pub fn is_at_upper_limit(&self) -> bool {
        self.upper_limit > 0.0 && (self.last_price - self.upper_limit).abs() < 0.001
    }

    /// Check if at lower limit (跌停)
    pub fn is_at_lower_limit(&self) -> bool {
        self.lower_limit > 0.0 && (self.last_price - self.lower_limit).abs() < 0.001
    }

    /// Calculate VWAP
    pub fn vwap(&self) -> f64 {
        if self.volume == 0.0 {
            return self.last_price;
        }
        self.turnover / self.volume
    }

    /// Calculate spread
    pub fn spread(&self) -> f64 {
        self.ask - self.bid
    }

    /// Calculate spread in basis points
    pub fn spread_bps(&self) -> f64 {
        let mid = (self.bid + self.ask) / 2.0;
        if mid == 0.0 {
            return 0.0;
        }
        (self.spread() / mid) * 10000.0
    }
}

/// Thread-safe market snapshot manager
pub struct SnapshotManager {
    /// Snapshots by symbol
    snapshots: Arc<DashMap<String, SymbolSnapshot>>,
    /// Subscribed symbols
    subscriptions: Arc<DashMap<String, bool>>,
}

impl Default for SnapshotManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SnapshotManager {
    /// Create a new snapshot manager
    pub fn new() -> Self {
        Self {
            snapshots: Arc::new(DashMap::new()),
            subscriptions: Arc::new(DashMap::new()),
        }
    }

    /// Subscribe to a symbol
    pub fn subscribe(&self, symbol: &str) {
        self.subscriptions.insert(symbol.to_string(), true);
    }

    /// Unsubscribe from a symbol
    pub fn unsubscribe(&self, symbol: &str) {
        self.subscriptions.remove(symbol);
        self.snapshots.remove(symbol);
    }

    /// Check if symbol is subscribed
    pub fn is_subscribed(&self, symbol: &str) -> bool {
        self.subscriptions.contains_key(symbol)
    }

    /// Process a tick and update snapshot
    pub fn process_tick(&self, tick: &Tick) -> Result<()> {
        if !self.is_subscribed(&tick.symbol) {
            // Auto-subscribe on first tick
            self.subscribe(&tick.symbol);
        }

        self.snapshots
            .entry(tick.symbol.clone())
            .and_modify(|snapshot| snapshot.update(tick))
            .or_insert_with(|| SymbolSnapshot::from_tick(tick));

        Ok(())
    }

    /// Get snapshot for a symbol
    pub fn get(&self, symbol: &str) -> Option<SymbolSnapshot> {
        self.snapshots.get(symbol).map(|r| r.clone())
    }

    /// Get all snapshots
    pub fn get_all(&self) -> Vec<SymbolSnapshot> {
        self.snapshots.iter().map(|r| r.value().clone()).collect()
    }

    /// Get number of tracked symbols
    pub fn symbol_count(&self) -> usize {
        self.snapshots.len()
    }

    /// Set previous close price for a symbol
    pub fn set_prev_close(&self, symbol: &str, prev_close: f64) {
        if let Some(mut snapshot) = self.snapshots.get_mut(symbol) {
            snapshot.prev_close = prev_close;
        }
    }

    /// Set price limits for a symbol
    pub fn set_limits(&self, symbol: &str, upper: f64, lower: f64) {
        if let Some(mut snapshot) = self.snapshots.get_mut(symbol) {
            snapshot.upper_limit = upper;
            snapshot.lower_limit = lower;
        }
    }

    /// Clear all snapshots
    pub fn clear(&self) {
        self.snapshots.clear();
    }

    /// Reset for new trading day (keep subscriptions, clear data)
    pub fn reset_for_new_day(&self) {
        self.snapshots.clear();
    }
}

impl Clone for SnapshotManager {
    fn clone(&self) -> Self {
        Self {
            snapshots: Arc::clone(&self.snapshots),
            subscriptions: Arc::clone(&self.subscriptions),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tick::Tick;

    fn make_tick(symbol: &str, price: f64, volume: f64) -> Tick {
        Tick::new(
            symbol.to_string(),
            Utc::now(),
            price,
            volume,
            price - 0.01,
            price + 0.01,
        )
        .unwrap()
    }

    #[test]
    fn test_snapshot_creation() {
        let tick = make_tick("000001.SZ", 10.0, 1000.0);
        let snapshot = SymbolSnapshot::from_tick(&tick);

        assert_eq!(snapshot.symbol, "000001.SZ");
        assert_eq!(snapshot.last_price, 10.0);
        assert_eq!(snapshot.open, 10.0);
        assert_eq!(snapshot.high, 10.0);
        assert_eq!(snapshot.low, 10.0);
    }

    #[test]
    fn test_snapshot_update() {
        let tick1 = make_tick("TEST", 10.0, 100.0);
        let mut snapshot = SymbolSnapshot::from_tick(&tick1);

        let tick2 = make_tick("TEST", 12.0, 200.0);
        snapshot.update(&tick2);

        assert_eq!(snapshot.last_price, 12.0);
        assert_eq!(snapshot.high, 12.0);
        assert_eq!(snapshot.low, 10.0);
        assert_eq!(snapshot.volume, 300.0);
    }

    #[test]
    fn test_snapshot_manager() {
        let manager = SnapshotManager::new();

        let tick1 = make_tick("000001.SZ", 10.0, 100.0);
        manager.process_tick(&tick1).unwrap();

        let tick2 = make_tick("000001.SZ", 10.5, 200.0);
        manager.process_tick(&tick2).unwrap();

        let snapshot = manager.get("000001.SZ").unwrap();
        assert_eq!(snapshot.last_price, 10.5);
        assert_eq!(snapshot.high, 10.5);
        assert_eq!(snapshot.low, 10.0);
    }

    #[test]
    fn test_change_calculation() {
        let tick = make_tick("TEST", 11.0, 100.0);
        let mut snapshot = SymbolSnapshot::from_tick(&tick);
        snapshot.prev_close = 10.0;

        assert_eq!(snapshot.change(), 1.0);
        assert!((snapshot.change_pct() - 10.0).abs() < 1e-10);
    }

    #[test]
    fn test_limit_detection() {
        let tick = make_tick("TEST", 11.0, 100.0);
        let mut snapshot = SymbolSnapshot::from_tick(&tick);
        snapshot.upper_limit = 11.0;
        snapshot.lower_limit = 9.0;

        assert!(snapshot.is_at_upper_limit());
        assert!(!snapshot.is_at_lower_limit());
    }
}
