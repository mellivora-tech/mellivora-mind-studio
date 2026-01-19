//! Risk Engine - High-performance portfolio risk calculation
//!
//! This crate provides real-time risk calculation capabilities for portfolio management,
//! including factor-based risk decomposition, VaR calculation, and covariance estimation.

pub mod factor;
pub mod portfolio;
// pub mod grpc;

use thiserror::Error;

/// Risk engine error types
#[derive(Error, Debug)]
pub enum RiskError {
    #[error("Invalid portfolio weights: {0}")]
    InvalidWeights(String),
    
    #[error("Missing factor exposure for security: {0}")]
    MissingExposure(String),
    
    #[error("Covariance matrix not positive definite")]
    NonPositiveDefinite,
    
    #[error("Dimension mismatch: expected {expected}, got {actual}")]
    DimensionMismatch { expected: usize, actual: usize },
    
    #[error("Calculation error: {0}")]
    CalculationError(String),
}

pub type Result<T> = std::result::Result<T, RiskError>;
