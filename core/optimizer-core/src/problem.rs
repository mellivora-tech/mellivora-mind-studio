//! Optimization problem definition
//!
//! Defines the portfolio optimization problem structure.

use crate::constraints::ConstraintSet;
use crate::{OptimizerError, Result};
use serde::{Deserialize, Serialize};

/// Optimization objective type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ObjectiveType {
    /// Minimize variance (risk)
    MinimizeVariance,
    /// Maximize expected return
    MaximizeReturn,
    /// Maximize Sharpe ratio (return / risk)
    MaximizeSharpe,
    /// Risk parity (equal risk contribution)
    RiskParity,
    /// Mean-variance with risk aversion parameter
    MeanVariance,
}

/// Transaction cost model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionCostModel {
    /// Linear cost (e.g., commission rate)
    pub linear_cost: f64,
    /// Fixed cost per trade
    pub fixed_cost: f64,
    /// Market impact coefficient (for quadratic impact)
    pub impact_coefficient: f64,
}

impl Default for TransactionCostModel {
    fn default() -> Self {
        Self {
            linear_cost: 0.001, // 10 bps
            fixed_cost: 0.0,
            impact_coefficient: 0.0,
        }
    }
}

impl TransactionCostModel {
    /// Calculate transaction cost for a trade
    pub fn cost(&self, trade_value: f64) -> f64 {
        let abs_trade = trade_value.abs();
        self.fixed_cost
            + self.linear_cost * abs_trade
            + self.impact_coefficient * abs_trade * abs_trade
    }
}

/// Portfolio optimization problem
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationProblem {
    /// Number of assets
    pub n_assets: usize,
    /// Expected returns (n_assets)
    pub expected_returns: Vec<f64>,
    /// Covariance matrix (n_assets x n_assets)
    pub covariance: Vec<Vec<f64>>,
    /// Constraints
    pub constraints: ConstraintSet,
    /// Objective type
    pub objective: ObjectiveType,
    /// Risk aversion parameter (for mean-variance)
    pub risk_aversion: f64,
    /// Risk-free rate (for Sharpe ratio)
    pub risk_free_rate: f64,
    /// Transaction cost model
    pub transaction_costs: Option<TransactionCostModel>,
    /// Current weights (for turnover/rebalancing)
    pub current_weights: Option<Vec<f64>>,
}

impl OptimizationProblem {
    /// Create a new optimization problem builder
    pub fn builder(n_assets: usize) -> OptimizationProblemBuilder {
        OptimizationProblemBuilder::new(n_assets)
    }

    /// Validate the problem
    pub fn validate(&self) -> Result<()> {
        // Check dimensions
        if self.expected_returns.len() != self.n_assets {
            return Err(OptimizerError::DimensionMismatch {
                expected: self.n_assets,
                got: self.expected_returns.len(),
            });
        }

        if self.covariance.len() != self.n_assets {
            return Err(OptimizerError::DimensionMismatch {
                expected: self.n_assets,
                got: self.covariance.len(),
            });
        }

        for row in &self.covariance {
            if row.len() != self.n_assets {
                return Err(OptimizerError::DimensionMismatch {
                    expected: self.n_assets,
                    got: row.len(),
                });
            }
        }

        // Check covariance symmetry
        for i in 0..self.n_assets {
            for j in i + 1..self.n_assets {
                if (self.covariance[i][j] - self.covariance[j][i]).abs() > 1e-10 {
                    return Err(OptimizerError::InvalidInput(
                        "Covariance matrix is not symmetric".to_string(),
                    ));
                }
            }
        }

        // Check box constraint dimensions
        if let Some(box_constraint) = &self.constraints.box_constraint {
            if box_constraint.len() != self.n_assets {
                return Err(OptimizerError::DimensionMismatch {
                    expected: self.n_assets,
                    got: box_constraint.len(),
                });
            }
        }

        // Check current weights dimensions
        if let Some(current) = &self.current_weights {
            if current.len() != self.n_assets {
                return Err(OptimizerError::DimensionMismatch {
                    expected: self.n_assets,
                    got: current.len(),
                });
            }
        }

        Ok(())
    }

    /// Calculate portfolio variance for given weights
    pub fn portfolio_variance(&self, weights: &[f64]) -> f64 {
        let mut variance = 0.0;
        for i in 0..self.n_assets {
            for j in 0..self.n_assets {
                variance += weights[i] * weights[j] * self.covariance[i][j];
            }
        }
        variance
    }

    /// Calculate portfolio expected return for given weights
    pub fn portfolio_return(&self, weights: &[f64]) -> f64 {
        weights
            .iter()
            .zip(self.expected_returns.iter())
            .map(|(w, r)| w * r)
            .sum()
    }

    /// Calculate Sharpe ratio for given weights
    pub fn sharpe_ratio(&self, weights: &[f64]) -> f64 {
        let ret = self.portfolio_return(weights);
        let vol = self.portfolio_variance(weights).sqrt();
        if vol == 0.0 {
            return 0.0;
        }
        (ret - self.risk_free_rate) / vol
    }
}

/// Builder for OptimizationProblem
pub struct OptimizationProblemBuilder {
    n_assets: usize,
    expected_returns: Option<Vec<f64>>,
    covariance: Option<Vec<Vec<f64>>>,
    constraints: ConstraintSet,
    objective: ObjectiveType,
    risk_aversion: f64,
    risk_free_rate: f64,
    transaction_costs: Option<TransactionCostModel>,
    current_weights: Option<Vec<f64>>,
}

impl OptimizationProblemBuilder {
    /// Create a new builder
    pub fn new(n_assets: usize) -> Self {
        Self {
            n_assets,
            expected_returns: None,
            covariance: None,
            constraints: ConstraintSet::long_only_full_investment(n_assets),
            objective: ObjectiveType::MinimizeVariance,
            risk_aversion: 1.0,
            risk_free_rate: 0.0,
            transaction_costs: None,
            current_weights: None,
        }
    }

    /// Set expected returns
    pub fn expected_returns(mut self, returns: Vec<f64>) -> Self {
        self.expected_returns = Some(returns);
        self
    }

    /// Set covariance matrix
    pub fn covariance(mut self, cov: Vec<Vec<f64>>) -> Self {
        self.covariance = Some(cov);
        self
    }

    /// Set constraints
    pub fn constraints(mut self, constraints: ConstraintSet) -> Self {
        self.constraints = constraints;
        self
    }

    /// Set objective type
    pub fn objective(mut self, objective: ObjectiveType) -> Self {
        self.objective = objective;
        self
    }

    /// Set risk aversion
    pub fn risk_aversion(mut self, lambda: f64) -> Self {
        self.risk_aversion = lambda;
        self
    }

    /// Set risk-free rate
    pub fn risk_free_rate(mut self, rate: f64) -> Self {
        self.risk_free_rate = rate;
        self
    }

    /// Set transaction costs
    pub fn transaction_costs(mut self, costs: TransactionCostModel) -> Self {
        self.transaction_costs = Some(costs);
        self
    }

    /// Set current weights
    pub fn current_weights(mut self, weights: Vec<f64>) -> Self {
        self.current_weights = Some(weights);
        self
    }

    /// Build the optimization problem
    pub fn build(self) -> Result<OptimizationProblem> {
        let expected_returns = self
            .expected_returns
            .ok_or_else(|| OptimizerError::InvalidInput("Expected returns not set".to_string()))?;

        let covariance = self
            .covariance
            .ok_or_else(|| OptimizerError::InvalidInput("Covariance not set".to_string()))?;

        let problem = OptimizationProblem {
            n_assets: self.n_assets,
            expected_returns,
            covariance,
            constraints: self.constraints,
            objective: self.objective,
            risk_aversion: self.risk_aversion,
            risk_free_rate: self.risk_free_rate,
            transaction_costs: self.transaction_costs,
            current_weights: self.current_weights,
        };

        problem.validate()?;
        Ok(problem)
    }
}

/// Optimization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// Optimal weights
    pub weights: Vec<f64>,
    /// Portfolio expected return
    pub expected_return: f64,
    /// Portfolio variance
    pub variance: f64,
    /// Portfolio volatility (std dev)
    pub volatility: f64,
    /// Sharpe ratio
    pub sharpe_ratio: f64,
    /// Number of iterations
    pub iterations: u32,
    /// Solver status
    pub status: SolverStatus,
    /// Total transaction cost (if applicable)
    pub transaction_cost: Option<f64>,
}

/// Solver status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SolverStatus {
    /// Optimal solution found
    Optimal,
    /// Solution is feasible but may not be optimal
    SubOptimal,
    /// Problem is infeasible
    Infeasible,
    /// Problem is unbounded
    Unbounded,
    /// Maximum iterations reached
    MaxIterations,
    /// Numerical issues encountered
    NumericalError,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constraints::{BoxConstraint, LinearConstraint};

    #[test]
    fn test_problem_builder() {
        let returns = vec![0.10, 0.15, 0.12];
        let cov = vec![
            vec![0.04, 0.01, 0.02],
            vec![0.01, 0.09, 0.03],
            vec![0.02, 0.03, 0.0625],
        ];

        let problem = OptimizationProblem::builder(3)
            .expected_returns(returns)
            .covariance(cov)
            .objective(ObjectiveType::MinimizeVariance)
            .build()
            .unwrap();

        assert_eq!(problem.n_assets, 3);
        assert_eq!(problem.objective, ObjectiveType::MinimizeVariance);
    }

    #[test]
    fn test_portfolio_metrics() {
        let returns = vec![0.10, 0.15];
        let cov = vec![vec![0.04, 0.01], vec![0.01, 0.09]];

        let problem = OptimizationProblem::builder(2)
            .expected_returns(returns)
            .covariance(cov)
            .build()
            .unwrap();

        let weights = vec![0.5, 0.5];

        // Expected return = 0.5 * 0.10 + 0.5 * 0.15 = 0.125
        let ret = problem.portfolio_return(&weights);
        assert!((ret - 0.125).abs() < 1e-10);

        // Variance = w'Σw = 0.5*0.5*0.04 + 2*0.5*0.5*0.01 + 0.5*0.5*0.09 = 0.0375
        let var = problem.portfolio_variance(&weights);
        assert!((var - 0.0375).abs() < 1e-10);
    }

    #[test]
    fn test_validation() {
        let returns = vec![0.10, 0.15];
        let cov = vec![vec![0.04, 0.01], vec![0.01, 0.09]];

        // Wrong dimension
        let result = OptimizationProblem::builder(3)
            .expected_returns(returns)
            .covariance(cov)
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_transaction_cost() {
        let model = TransactionCostModel::default();
        assert!((model.cost(1000.0) - 1.0).abs() < 1e-10); // 10 bps = 0.1%
    }
}
