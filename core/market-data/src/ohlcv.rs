//! OHLCV bar aggregation
//!
//! Aggregates tick data into OHLCV (Open, High, Low, Close, Volume) bars.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::tick::Tick;
use crate::{MarketDataError, Result};

/// Bar period for aggregation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BarPeriod {
    /// 1 minute bars
    Minute1,
    /// 5 minute bars
    Minute5,
    /// 15 minute bars
    Minute15,
    /// 30 minute bars
    Minute30,
    /// 60 minute bars (1 hour)
    Minute60,
    /// Daily bars
    Daily,
}

impl BarPeriod {
    /// Get duration in seconds
    pub fn seconds(&self) -> i64 {
        match self {
            BarPeriod::Minute1 => 60,
            BarPeriod::Minute5 => 300,
            BarPeriod::Minute15 => 900,
            BarPeriod::Minute30 => 1800,
            BarPeriod::Minute60 => 3600,
            BarPeriod::Daily => 86400,
        }
    }

    /// Get duration
    pub fn duration(&self) -> Duration {
        Duration::seconds(self.seconds())
    }
}

/// OHLCV bar representing aggregated price/volume data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bar {
    /// Symbol identifier
    pub symbol: String,
    /// Bar start timestamp
    pub timestamp: DateTime<Utc>,
    /// Bar period
    pub period: BarPeriod,
    /// Opening price
    pub open: f64,
    /// Highest price
    pub high: f64,
    /// Lowest price
    pub low: f64,
    /// Closing price
    pub close: f64,
    /// Total volume
    pub volume: f64,
    /// Total turnover
    pub turnover: f64,
    /// Number of ticks aggregated
    pub tick_count: u64,
    /// Volume Weighted Average Price
    pub vwap: f64,
}

impl Bar {
    /// Create a new bar from the first tick
    pub fn new(tick: &Tick, period: BarPeriod) -> Self {
        let bar_start = Self::align_timestamp(tick.timestamp, period);

        Self {
            symbol: tick.symbol.clone(),
            timestamp: bar_start,
            period,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: tick.volume,
            turnover: tick.turnover,
            tick_count: 1,
            vwap: tick.price,
        }
    }

    /// Align timestamp to bar boundary
    pub fn align_timestamp(ts: DateTime<Utc>, period: BarPeriod) -> DateTime<Utc> {
        let secs = ts.timestamp();
        let period_secs = period.seconds();
        let aligned_secs = (secs / period_secs) * period_secs;
        DateTime::from_timestamp(aligned_secs, 0).unwrap_or(ts)
    }

    /// Check if a tick belongs to this bar
    pub fn accepts(&self, tick: &Tick) -> bool {
        if tick.symbol != self.symbol {
            return false;
        }
        let tick_bar_start = Self::align_timestamp(tick.timestamp, self.period);
        tick_bar_start == self.timestamp
    }

    /// Update bar with a new tick
    pub fn update(&mut self, tick: &Tick) -> Result<()> {
        if !self.accepts(tick) {
            return Err(MarketDataError::AggregationError(
                "Tick does not belong to this bar".to_string(),
            ));
        }

        self.high = self.high.max(tick.price);
        self.low = self.low.min(tick.price);
        self.close = tick.price;
        self.volume += tick.volume;
        self.turnover += tick.turnover;
        self.tick_count += 1;

        // Update VWAP
        if self.volume > 0.0 {
            self.vwap = self.turnover / self.volume;
        }

        Ok(())
    }

    /// Check if bar is complete (past its end time)
    pub fn is_complete(&self, current_time: DateTime<Utc>) -> bool {
        current_time >= self.timestamp + self.period.duration()
    }

    /// Calculate bar range (high - low)
    #[inline]
    pub fn range(&self) -> f64 {
        self.high - self.low
    }

    /// Calculate bar body (|close - open|)
    #[inline]
    pub fn body(&self) -> f64 {
        (self.close - self.open).abs()
    }

    /// Check if bar is bullish (close > open)
    #[inline]
    pub fn is_bullish(&self) -> bool {
        self.close > self.open
    }

    /// Calculate return percentage
    #[inline]
    pub fn return_pct(&self) -> f64 {
        if self.open == 0.0 {
            return 0.0;
        }
        (self.close - self.open) / self.open * 100.0
    }
}

/// Bar aggregator that processes ticks into bars
pub struct BarAggregator {
    /// Bar period
    period: BarPeriod,
    /// Current incomplete bar
    current_bar: Option<Bar>,
    /// Completed bars
    completed_bars: Vec<Bar>,
    /// Maximum completed bars to keep
    max_bars: usize,
}

impl BarAggregator {
    /// Create a new bar aggregator
    pub fn new(period: BarPeriod, max_bars: usize) -> Self {
        Self {
            period,
            current_bar: None,
            completed_bars: Vec::with_capacity(max_bars),
            max_bars,
        }
    }

    /// Process a tick, potentially completing a bar
    pub fn process(&mut self, tick: &Tick) -> Option<Bar> {
        let mut completed = None;

        match &mut self.current_bar {
            Some(bar) if bar.accepts(tick) => {
                // Tick belongs to current bar
                bar.update(tick).ok();
            }
            Some(_) | None => {
                // New bar needed - complete current if exists
                if let Some(bar) = self.current_bar.take() {
                    completed = Some(bar.clone());
                    self.store_completed(bar);
                }
                self.current_bar = Some(Bar::new(tick, self.period));
            }
        }

        completed
    }

    /// Force complete current bar (e.g., at market close)
    pub fn flush(&mut self) -> Option<Bar> {
        if let Some(bar) = self.current_bar.take() {
            let result = bar.clone();
            self.store_completed(bar);
            return Some(result);
        }
        None
    }

    /// Store a completed bar
    fn store_completed(&mut self, bar: Bar) {
        if self.completed_bars.len() >= self.max_bars {
            self.completed_bars.remove(0);
        }
        self.completed_bars.push(bar);
    }

    /// Get completed bars
    pub fn bars(&self) -> &[Bar] {
        &self.completed_bars
    }

    /// Get current incomplete bar
    pub fn current(&self) -> Option<&Bar> {
        self.current_bar.as_ref()
    }

    /// Clear all bars
    pub fn clear(&mut self) {
        self.current_bar = None;
        self.completed_bars.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tick::Tick;
    use chrono::TimeZone;

    fn make_tick(symbol: &str, price: f64, volume: f64, timestamp: DateTime<Utc>) -> Tick {
        Tick::new(
            symbol.to_string(),
            timestamp,
            price,
            volume,
            price - 0.01,
            price + 0.01,
        )
        .unwrap()
    }

    #[test]
    fn test_bar_period() {
        assert_eq!(BarPeriod::Minute1.seconds(), 60);
        assert_eq!(BarPeriod::Minute5.seconds(), 300);
        assert_eq!(BarPeriod::Daily.seconds(), 86400);
    }

    #[test]
    fn test_timestamp_alignment() {
        // 10:03:45 should align to 10:03:00 for 1min bars
        let ts = Utc.with_ymd_and_hms(2024, 1, 15, 10, 3, 45).unwrap();
        let aligned = Bar::align_timestamp(ts, BarPeriod::Minute1);
        assert_eq!(aligned.minute(), 3);
        assert_eq!(aligned.second(), 0);

        // 10:03:45 should align to 10:00:00 for 5min bars
        let aligned5 = Bar::align_timestamp(ts, BarPeriod::Minute5);
        assert_eq!(aligned5.minute(), 0);
    }

    #[test]
    fn test_bar_aggregation() {
        let mut aggregator = BarAggregator::new(BarPeriod::Minute1, 100);

        let base_time = Utc.with_ymd_and_hms(2024, 1, 15, 10, 0, 0).unwrap();

        // First tick
        let t1 = make_tick("TEST", 10.0, 100.0, base_time);
        assert!(aggregator.process(&t1).is_none());
        assert!(aggregator.current().is_some());

        // Second tick in same bar
        let t2 = make_tick("TEST", 10.5, 200.0, base_time + Duration::seconds(30));
        assert!(aggregator.process(&t2).is_none());

        let current = aggregator.current().unwrap();
        assert_eq!(current.open, 10.0);
        assert_eq!(current.high, 10.5);
        assert_eq!(current.close, 10.5);
        assert_eq!(current.volume, 300.0);

        // Tick in new bar completes previous
        let t3 = make_tick("TEST", 11.0, 150.0, base_time + Duration::seconds(61));
        let completed = aggregator.process(&t3);
        assert!(completed.is_some());

        let bar = completed.unwrap();
        assert_eq!(bar.open, 10.0);
        assert_eq!(bar.close, 10.5);
    }

    #[test]
    fn test_bar_metrics() {
        let ts = Utc::now();
        let tick = make_tick("TEST", 10.0, 100.0, ts);
        let mut bar = Bar::new(&tick, BarPeriod::Minute1);

        // Update with higher price
        let tick2 = make_tick("TEST", 12.0, 200.0, ts + Duration::seconds(30));
        bar.update(&tick2).unwrap();

        assert!(bar.is_bullish());
        assert_eq!(bar.range(), 2.0);
        assert_eq!(bar.body(), 2.0);
        assert!((bar.return_pct() - 20.0).abs() < 1e-10);
    }
}
