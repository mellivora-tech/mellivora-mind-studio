//! Optimizer Core
//!
//! High-performance portfolio optimization using quadratic programming.
//!
//! # Features
//! - Mean-variance optimization (Markowitz)
//! - Risk parity optimization
//! - Maximum Sharpe ratio optimization
//! - Custom constraint support (box, linear, sector, turnover)
//! - Transaction cost modeling

pub mod constraints;
pub mod problem;
pub mod solver;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum OptimizerError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Dimension mismatch: expected {expected}, got {got}")]
    DimensionMismatch { expected: usize, got: usize },

    #[error("Matrix not positive semi-definite")]
    NotPositiveSemiDefinite,

    #[error("Infeasible problem: {0}")]
    Infeasible(String),

    #[error("Solver failed: {0}")]
    SolverFailed(String),

    #[error("Maximum iterations exceeded")]
    MaxIterationsExceeded,

    #[error("Numerical error: {0}")]
    NumericalError(String),
}

pub type Result<T> = std::result::Result<T, OptimizerError>;
