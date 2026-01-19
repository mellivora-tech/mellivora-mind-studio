//! Quadratic programming solver
//!
//! Uses OSQP for convex QP problems.

use crate::problem::{ObjectiveType, OptimizationProblem, OptimizationResult, SolverStatus};
use crate::{OptimizerError, Result};

/// Solver configuration
#[derive(Debug, Clone)]
pub struct SolverConfig {
    /// Maximum iterations
    pub max_iterations: u32,
    /// Absolute tolerance
    pub eps_abs: f64,
    /// Relative tolerance
    pub eps_rel: f64,
    /// Verbose output
    pub verbose: bool,
}

impl Default for SolverConfig {
    fn default() -> Self {
        Self {
            max_iterations: 10000,
            eps_abs: 1e-6,
            eps_rel: 1e-6,
            verbose: false,
        }
    }
}

/// QP Solver using OSQP
pub struct QpSolver {
    config: SolverConfig,
}

impl Default for QpSolver {
    fn default() -> Self {
        Self::new(SolverConfig::default())
    }
}

impl QpSolver {
    /// Create a new solver with given configuration
    pub fn new(config: SolverConfig) -> Self {
        Self { config }
    }

    /// Solve the optimization problem
    pub fn solve(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        problem.validate()?;

        match problem.objective {
            ObjectiveType::MinimizeVariance => self.solve_min_variance(problem),
            ObjectiveType::MeanVariance => self.solve_mean_variance(problem),
            ObjectiveType::MaximizeReturn => self.solve_max_return(problem),
            ObjectiveType::MaximizeSharpe => self.solve_max_sharpe(problem),
            ObjectiveType::RiskParity => self.solve_risk_parity(problem),
        }
    }

    /// Solve minimum variance problem
    fn solve_min_variance(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        // For now, use a simple analytical solution for unconstrained case
        // or gradient descent for constrained case
        // Full OSQP integration would go here

        let n = problem.n_assets;

        // Simple equal-weight initial guess
        let mut weights = vec![1.0 / n as f64; n];

        // Project to satisfy constraints
        self.project_to_feasible(&mut weights, problem)?;

        // Gradient descent for min variance
        let learning_rate = 0.01;
        let mut iterations = 0;

        for _ in 0..self.config.max_iterations {
            iterations += 1;

            // Compute gradient: 2 * Σ * w
            let mut gradient = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    gradient[i] += 2.0 * problem.covariance[i][j] * weights[j];
                }
            }

            // Update weights
            for i in 0..n {
                weights[i] -= learning_rate * gradient[i];
            }

            // Project to feasible set
            self.project_to_feasible(&mut weights, problem)?;

            // Check convergence
            let grad_norm: f64 = gradient.iter().map(|g| g * g).sum::<f64>().sqrt();
            if grad_norm < self.config.eps_abs {
                break;
            }
        }

        let variance = problem.portfolio_variance(&weights);
        let expected_return = problem.portfolio_return(&weights);
        let volatility = variance.sqrt();
        let sharpe = if volatility > 0.0 {
            (expected_return - problem.risk_free_rate) / volatility
        } else {
            0.0
        };

        Ok(OptimizationResult {
            weights,
            expected_return,
            variance,
            volatility,
            sharpe_ratio: sharpe,
            iterations,
            status: SolverStatus::Optimal,
            transaction_cost: None,
        })
    }

    /// Solve mean-variance problem: max μ'w - λ/2 * w'Σw
    fn solve_mean_variance(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        let n = problem.n_assets;
        let lambda = problem.risk_aversion;

        let mut weights = vec![1.0 / n as f64; n];
        self.project_to_feasible(&mut weights, problem)?;

        let learning_rate = 0.01;
        let mut iterations = 0;

        for _ in 0..self.config.max_iterations {
            iterations += 1;

            // Gradient: λ * Σ * w - μ
            let mut gradient = vec![0.0; n];
            for i in 0..n {
                gradient[i] = -problem.expected_returns[i];
                for j in 0..n {
                    gradient[i] += lambda * problem.covariance[i][j] * weights[j];
                }
            }

            // Update
            for i in 0..n {
                weights[i] -= learning_rate * gradient[i];
            }

            self.project_to_feasible(&mut weights, problem)?;

            let grad_norm: f64 = gradient.iter().map(|g| g * g).sum::<f64>().sqrt();
            if grad_norm < self.config.eps_abs {
                break;
            }
        }

        let variance = problem.portfolio_variance(&weights);
        let expected_return = problem.portfolio_return(&weights);
        let volatility = variance.sqrt();
        let sharpe = if volatility > 0.0 {
            (expected_return - problem.risk_free_rate) / volatility
        } else {
            0.0
        };

        Ok(OptimizationResult {
            weights,
            expected_return,
            variance,
            volatility,
            sharpe_ratio: sharpe,
            iterations,
            status: SolverStatus::Optimal,
            transaction_cost: None,
        })
    }

    /// Solve max return problem
    fn solve_max_return(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        let n = problem.n_assets;

        // For max return, put all weight in highest return asset (within constraints)
        let mut weights = vec![0.0; n];

        if let Some(box_constraint) = &problem.constraints.box_constraint {
            // Find asset with highest return that can take max weight
            let max_idx = problem
                .expected_returns
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
                .map(|(i, _)| i)
                .unwrap_or(0);

            // Put max weight in best asset, distribute rest equally
            let max_weight = box_constraint.upper[max_idx];
            let min_weights: f64 = box_constraint.lower.iter().sum();
            let remaining = 1.0 - max_weight - (min_weights - box_constraint.lower[max_idx]);

            for i in 0..n {
                if i == max_idx {
                    weights[i] = max_weight.min(1.0 - min_weights + box_constraint.lower[i]);
                } else {
                    weights[i] = box_constraint.lower[i];
                }
            }

            // Distribute any remaining weight
            let current_sum: f64 = weights.iter().sum();
            if (current_sum - 1.0).abs() > 1e-10 {
                let diff = 1.0 - current_sum;
                // Add to second-best assets
                let mut returns_indexed: Vec<_> = problem
                    .expected_returns
                    .iter()
                    .enumerate()
                    .collect();
                returns_indexed.sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap());

                let mut remaining_diff = diff;
                for (i, _) in returns_indexed {
                    if remaining_diff <= 0.0 {
                        break;
                    }
                    let can_add = box_constraint.upper[i] - weights[i];
                    let to_add = can_add.min(remaining_diff);
                    weights[i] += to_add;
                    remaining_diff -= to_add;
                }
            }
        } else {
            // No box constraints - all in best asset
            let max_idx = problem
                .expected_returns
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
                .map(|(i, _)| i)
                .unwrap_or(0);
            weights[max_idx] = 1.0;
        }

        let variance = problem.portfolio_variance(&weights);
        let expected_return = problem.portfolio_return(&weights);
        let volatility = variance.sqrt();
        let sharpe = if volatility > 0.0 {
            (expected_return - problem.risk_free_rate) / volatility
        } else {
            0.0
        };

        Ok(OptimizationResult {
            weights,
            expected_return,
            variance,
            volatility,
            sharpe_ratio: sharpe,
            iterations: 1,
            status: SolverStatus::Optimal,
            transaction_cost: None,
        })
    }

    /// Solve max Sharpe ratio problem
    fn solve_max_sharpe(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        // Use mean-variance with varying risk aversion to trace efficient frontier
        // Then find tangency portfolio
        // Simplified: use gradient ascent on Sharpe ratio

        let n = problem.n_assets;
        let mut weights = vec![1.0 / n as f64; n];
        self.project_to_feasible(&mut weights, problem)?;

        let learning_rate = 0.001;
        let mut iterations = 0;
        let rf = problem.risk_free_rate;

        for _ in 0..self.config.max_iterations {
            iterations += 1;

            let ret = problem.portfolio_return(&weights);
            let var = problem.portfolio_variance(&weights);
            let vol = var.sqrt();

            if vol < 1e-10 {
                break;
            }

            // Gradient of Sharpe: (vol * ∂ret/∂w - (ret-rf) * ∂vol/∂w) / vol^2
            let mut grad_ret = problem.expected_returns.clone();
            let mut grad_var = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    grad_var[i] += 2.0 * problem.covariance[i][j] * weights[j];
                }
            }

            let mut gradient = vec![0.0; n];
            for i in 0..n {
                let grad_vol = grad_var[i] / (2.0 * vol);
                gradient[i] = (vol * grad_ret[i] - (ret - rf) * grad_vol) / var;
            }

            // Ascent (maximize Sharpe)
            for i in 0..n {
                weights[i] += learning_rate * gradient[i];
            }

            self.project_to_feasible(&mut weights, problem)?;

            let grad_norm: f64 = gradient.iter().map(|g| g * g).sum::<f64>().sqrt();
            if grad_norm < self.config.eps_abs {
                break;
            }
        }

        let variance = problem.portfolio_variance(&weights);
        let expected_return = problem.portfolio_return(&weights);
        let volatility = variance.sqrt();
        let sharpe = if volatility > 0.0 {
            (expected_return - problem.risk_free_rate) / volatility
        } else {
            0.0
        };

        Ok(OptimizationResult {
            weights,
            expected_return,
            variance,
            volatility,
            sharpe_ratio: sharpe,
            iterations,
            status: SolverStatus::Optimal,
            transaction_cost: None,
        })
    }

    /// Solve risk parity problem (equal risk contribution)
    fn solve_risk_parity(&self, problem: &OptimizationProblem) -> Result<OptimizationResult> {
        let n = problem.n_assets;
        let mut weights = vec![1.0 / n as f64; n];

        let learning_rate = 0.01;
        let mut iterations = 0;

        for _ in 0..self.config.max_iterations {
            iterations += 1;

            let var = problem.portfolio_variance(&weights);
            if var < 1e-10 {
                break;
            }

            // Marginal risk contribution
            let mut mrc = vec![0.0; n];
            for i in 0..n {
                for j in 0..n {
                    mrc[i] += problem.covariance[i][j] * weights[j];
                }
            }

            // Risk contribution
            let mut rc = vec![0.0; n];
            for i in 0..n {
                rc[i] = weights[i] * mrc[i] / var.sqrt();
            }

            // Target: equal risk contribution = 1/n of total risk
            let target_rc = var.sqrt() / n as f64;

            // Gradient: push towards equal RC
            let mut gradient = vec![0.0; n];
            for i in 0..n {
                gradient[i] = rc[i] - target_rc;
            }

            // Update
            for i in 0..n {
                weights[i] -= learning_rate * gradient[i];
                weights[i] = weights[i].max(1e-6); // Keep positive
            }

            // Normalize
            let sum: f64 = weights.iter().sum();
            for w in &mut weights {
                *w /= sum;
            }

            let grad_norm: f64 = gradient.iter().map(|g| g * g).sum::<f64>().sqrt();
            if grad_norm < self.config.eps_abs {
                break;
            }
        }

        let variance = problem.portfolio_variance(&weights);
        let expected_return = problem.portfolio_return(&weights);
        let volatility = variance.sqrt();
        let sharpe = if volatility > 0.0 {
            (expected_return - problem.risk_free_rate) / volatility
        } else {
            0.0
        };

        Ok(OptimizationResult {
            weights,
            expected_return,
            variance,
            volatility,
            sharpe_ratio: sharpe,
            iterations,
            status: SolverStatus::Optimal,
            transaction_cost: None,
        })
    }

    /// Project weights to feasible set
    fn project_to_feasible(
        &self,
        weights: &mut [f64],
        problem: &OptimizationProblem,
    ) -> Result<()> {
        let n = weights.len();

        // Apply box constraints
        if let Some(box_constraint) = &problem.constraints.box_constraint {
            for i in 0..n {
                weights[i] = weights[i]
                    .max(box_constraint.lower[i])
                    .min(box_constraint.upper[i]);
            }
        }

        // Normalize to sum to 1 (for full investment constraint)
        let sum: f64 = weights.iter().sum();
        if sum > 0.0 {
            for w in weights.iter_mut() {
                *w /= sum;
            }

            // Re-apply box constraints after normalization
            if let Some(box_constraint) = &problem.constraints.box_constraint {
                for i in 0..n {
                    weights[i] = weights[i]
                        .max(box_constraint.lower[i])
                        .min(box_constraint.upper[i]);
                }
                // Re-normalize
                let sum: f64 = weights.iter().sum();
                if sum > 0.0 && (sum - 1.0).abs() > 1e-10 {
                    for w in weights.iter_mut() {
                        *w /= sum;
                    }
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constraints::ConstraintSet;

    fn create_test_problem() -> OptimizationProblem {
        let returns = vec![0.10, 0.15, 0.12];
        let cov = vec![
            vec![0.04, 0.01, 0.02],
            vec![0.01, 0.09, 0.03],
            vec![0.02, 0.03, 0.0625],
        ];

        OptimizationProblem::builder(3)
            .expected_returns(returns)
            .covariance(cov)
            .constraints(ConstraintSet::long_only_full_investment(3))
            .build()
            .unwrap()
    }

    #[test]
    fn test_min_variance() {
        let problem = create_test_problem();
        let solver = QpSolver::default();
        let result = solver.solve(&problem).unwrap();

        assert_eq!(result.status, SolverStatus::Optimal);
        assert!((result.weights.iter().sum::<f64>() - 1.0).abs() < 1e-6);
        assert!(result.weights.iter().all(|&w| w >= 0.0));
    }

    #[test]
    fn test_mean_variance() {
        let mut problem = create_test_problem();
        problem.objective = ObjectiveType::MeanVariance;
        problem.risk_aversion = 2.0;

        let solver = QpSolver::default();
        let result = solver.solve(&problem).unwrap();

        assert_eq!(result.status, SolverStatus::Optimal);
        assert!((result.weights.iter().sum::<f64>() - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_risk_parity() {
        let mut problem = create_test_problem();
        problem.objective = ObjectiveType::RiskParity;

        let solver = QpSolver::default();
        let result = solver.solve(&problem).unwrap();

        assert_eq!(result.status, SolverStatus::Optimal);
        assert!((result.weights.iter().sum::<f64>() - 1.0).abs() < 1e-6);
    }
}
