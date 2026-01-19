//! Covariance Matrix Operations
//!
//! High-performance covariance matrix computation and manipulation for risk models.
//!
//! # Features
//! - Sample covariance estimation
//! - Shrinkage estimators (Ledoit-Wolf)
//! - Factor model covariance decomposition
//! - Eigenvalue decomposition and conditioning
//! - Parallel computation support

pub mod estimator;
pub mod factor;
pub mod matrix;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CovarianceError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Dimension mismatch: expected {expected}, got {got}")]
    DimensionMismatch { expected: usize, got: usize },

    #[error("Matrix not positive semi-definite")]
    NotPositiveSemiDefinite,

    #[error("Singular matrix")]
    SingularMatrix,

    #[error("Numerical error: {0}")]
    NumericalError(String),

    #[error("Insufficient observations: need at least {needed}, got {got}")]
    InsufficientObservations { needed: usize, got: usize },
}

pub type Result<T> = std::result::Result<T, CovarianceError>;
