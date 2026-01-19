//! Factor model covariance decomposition
//!
//! Implements Barra-style factor model covariance:
//! Σ = B * F * B^T + D
//!
//! Where:
//! - B: Factor loading matrix (n_assets x n_factors)
//! - F: Factor covariance matrix (n_factors x n_factors)
//! - D: Specific risk diagonal matrix (n_assets x n_assets)

use nalgebra::{DMatrix, DVector};

use crate::matrix::{is_positive_semi_definite, symmetrize};
use crate::{CovarianceError, Result};

/// Factor model covariance representation
#[derive(Debug, Clone)]
pub struct FactorCovariance {
    /// Factor loadings (n_assets x n_factors)
    pub loadings: DMatrix<f64>,
    /// Factor covariance (n_factors x n_factors)
    pub factor_cov: DMatrix<f64>,
    /// Specific variances (n_assets)
    pub specific_var: DVector<f64>,
}

impl FactorCovariance {
    /// Create a new factor covariance model
    pub fn new(
        loadings: DMatrix<f64>,
        factor_cov: DMatrix<f64>,
        specific_var: DVector<f64>,
    ) -> Result<Self> {
        let n_assets = loadings.nrows();
        let n_factors = loadings.ncols();

        // Validate dimensions
        if factor_cov.nrows() != n_factors || factor_cov.ncols() != n_factors {
            return Err(CovarianceError::DimensionMismatch {
                expected: n_factors,
                got: factor_cov.nrows(),
            });
        }

        if specific_var.len() != n_assets {
            return Err(CovarianceError::DimensionMismatch {
                expected: n_assets,
                got: specific_var.len(),
            });
        }

        // Validate factor covariance is PSD
        if !is_positive_semi_definite(&factor_cov, 1e-10) {
            return Err(CovarianceError::NotPositiveSemiDefinite);
        }

        // Validate specific variances are non-negative
        if specific_var.iter().any(|&v| v < 0.0) {
            return Err(CovarianceError::InvalidInput(
                "Specific variances must be non-negative".to_string(),
            ));
        }

        Ok(Self {
            loadings,
            factor_cov,
            specific_var,
        })
    }

    /// Number of assets
    pub fn n_assets(&self) -> usize {
        self.loadings.nrows()
    }

    /// Number of factors
    pub fn n_factors(&self) -> usize {
        self.loadings.ncols()
    }

    /// Compute full covariance matrix: B * F * B^T + D
    ///
    /// Note: This materializes the full n x n matrix, which may be expensive
    /// for large universes. Use factor-based operations when possible.
    pub fn to_full_matrix(&self) -> DMatrix<f64> {
        let n = self.n_assets();

        // B * F
        let bf = &self.loadings * &self.factor_cov;

        // B * F * B^T
        let bfbt = &bf * self.loadings.transpose();

        // Add specific risk diagonal
        let mut full = bfbt;
        for i in 0..n {
            full[(i, i)] += self.specific_var[i];
        }

        symmetrize(&full)
    }

    /// Compute portfolio variance using factor decomposition
    ///
    /// var(w) = w^T * B * F * B^T * w + w^T * D * w
    ///        = (B^T * w)^T * F * (B^T * w) + sum(w_i^2 * d_i)
    pub fn portfolio_variance(&self, weights: &DVector<f64>) -> Result<f64> {
        if weights.len() != self.n_assets() {
            return Err(CovarianceError::DimensionMismatch {
                expected: self.n_assets(),
                got: weights.len(),
            });
        }

        // Factor exposure: f = B^T * w
        let factor_exposure = self.loadings.transpose() * weights;

        // Factor variance: f^T * F * f
        let factor_var = factor_exposure.dot(&(&self.factor_cov * &factor_exposure));

        // Specific variance: sum(w_i^2 * d_i)
        let specific_var: f64 = weights
            .iter()
            .zip(self.specific_var.iter())
            .map(|(w, d)| w * w * d)
            .sum();

        Ok(factor_var + specific_var)
    }

    /// Compute portfolio factor exposures
    pub fn portfolio_factor_exposures(&self, weights: &DVector<f64>) -> Result<DVector<f64>> {
        if weights.len() != self.n_assets() {
            return Err(CovarianceError::DimensionMismatch {
                expected: self.n_assets(),
                got: weights.len(),
            });
        }

        Ok(self.loadings.transpose() * weights)
    }

    /// Compute marginal contribution to risk (MCTR) using factor model
    ///
    /// MCTR_i = (Σ * w)_i / sqrt(w^T * Σ * w)
    ///        = ((B * F * B^T + D) * w)_i / portfolio_vol
    pub fn marginal_contribution_to_risk(&self, weights: &DVector<f64>) -> Result<DVector<f64>> {
        let n = self.n_assets();
        if weights.len() != n {
            return Err(CovarianceError::DimensionMismatch {
                expected: n,
                got: weights.len(),
            });
        }

        let portfolio_var = self.portfolio_variance(weights)?;
        if portfolio_var <= 0.0 {
            return Err(CovarianceError::NumericalError(
                "Portfolio variance is zero".to_string(),
            ));
        }
        let portfolio_vol = portfolio_var.sqrt();

        // Compute Σ * w using factor structure
        // Σ * w = B * F * B^T * w + D * w
        //       = B * F * (B^T * w) + D * w
        let factor_exposure = self.loadings.transpose() * weights;
        let factor_contribution = &self.loadings * (&self.factor_cov * &factor_exposure);

        let mut sigma_w = factor_contribution;
        for i in 0..n {
            sigma_w[i] += self.specific_var[i] * weights[i];
        }

        Ok(sigma_w / portfolio_vol)
    }

    /// Compute risk contribution (weight * MCTR)
    pub fn risk_contribution(&self, weights: &DVector<f64>) -> Result<DVector<f64>> {
        let mctr = self.marginal_contribution_to_risk(weights)?;
        Ok(weights.component_mul(&mctr))
    }

    /// Decompose portfolio variance into factor and specific components
    pub fn variance_decomposition(
        &self,
        weights: &DVector<f64>,
    ) -> Result<VarianceDecomposition> {
        if weights.len() != self.n_assets() {
            return Err(CovarianceError::DimensionMismatch {
                expected: self.n_assets(),
                got: weights.len(),
            });
        }

        let factor_exposure = self.loadings.transpose() * weights;
        let factor_var = factor_exposure.dot(&(&self.factor_cov * &factor_exposure));

        let specific_var: f64 = weights
            .iter()
            .zip(self.specific_var.iter())
            .map(|(w, d)| w * w * d)
            .sum();

        let total_var = factor_var + specific_var;

        Ok(VarianceDecomposition {
            total_variance: total_var,
            factor_variance: factor_var,
            specific_variance: specific_var,
            factor_exposures: factor_exposure,
        })
    }

    /// Update factor covariance (for rolling/updating models)
    pub fn update_factor_covariance(&mut self, new_cov: DMatrix<f64>) -> Result<()> {
        if new_cov.nrows() != self.n_factors() || new_cov.ncols() != self.n_factors() {
            return Err(CovarianceError::DimensionMismatch {
                expected: self.n_factors(),
                got: new_cov.nrows(),
            });
        }

        if !is_positive_semi_definite(&new_cov, 1e-10) {
            return Err(CovarianceError::NotPositiveSemiDefinite);
        }

        self.factor_cov = new_cov;
        Ok(())
    }
}

/// Variance decomposition result
#[derive(Debug, Clone)]
pub struct VarianceDecomposition {
    /// Total portfolio variance
    pub total_variance: f64,
    /// Variance from factor exposures
    pub factor_variance: f64,
    /// Variance from specific risk
    pub specific_variance: f64,
    /// Portfolio factor exposures
    pub factor_exposures: DVector<f64>,
}

impl VarianceDecomposition {
    /// Fraction of variance from factors
    pub fn factor_fraction(&self) -> f64 {
        if self.total_variance == 0.0 {
            return 0.0;
        }
        self.factor_variance / self.total_variance
    }

    /// Fraction of variance from specific risk
    pub fn specific_fraction(&self) -> f64 {
        if self.total_variance == 0.0 {
            return 0.0;
        }
        self.specific_variance / self.total_variance
    }

    /// Total volatility
    pub fn total_volatility(&self) -> f64 {
        self.total_variance.sqrt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nalgebra::{dmatrix, dvector};

    fn create_test_model() -> FactorCovariance {
        // 5 assets, 2 factors
        let loadings = dmatrix![
            1.0, 0.5;
            0.8, 0.6;
            1.2, 0.3;
            0.9, 0.7;
            1.1, 0.4
        ];

        let factor_cov = dmatrix![
            0.04, 0.01;
            0.01, 0.02
        ];

        let specific_var = dvector![0.01, 0.015, 0.012, 0.018, 0.011];

        FactorCovariance::new(loadings, factor_cov, specific_var).unwrap()
    }

    #[test]
    fn test_factor_covariance_creation() {
        let model = create_test_model();
        assert_eq!(model.n_assets(), 5);
        assert_eq!(model.n_factors(), 2);
    }

    #[test]
    fn test_full_matrix() {
        let model = create_test_model();
        let full = model.to_full_matrix();

        assert_eq!(full.nrows(), 5);
        assert_eq!(full.ncols(), 5);

        // Should be symmetric
        for i in 0..5 {
            for j in i + 1..5 {
                assert!((full[(i, j)] - full[(j, i)]).abs() < 1e-10);
            }
        }

        // Diagonal should be positive
        for i in 0..5 {
            assert!(full[(i, i)] > 0.0);
        }
    }

    #[test]
    fn test_portfolio_variance() {
        let model = create_test_model();
        let weights = dvector![0.2, 0.2, 0.2, 0.2, 0.2];

        let var_factor = model.portfolio_variance(&weights).unwrap();

        // Compare with full matrix calculation
        let full = model.to_full_matrix();
        let var_full = weights.dot(&(&full * &weights));

        assert!((var_factor - var_full).abs() < 1e-10);
    }

    #[test]
    fn test_variance_decomposition() {
        let model = create_test_model();
        let weights = dvector![0.2, 0.2, 0.2, 0.2, 0.2];

        let decomp = model.variance_decomposition(&weights).unwrap();

        // Components should sum to total
        assert!(
            (decomp.factor_variance + decomp.specific_variance - decomp.total_variance).abs()
                < 1e-10
        );

        // Fractions should sum to 1
        assert!((decomp.factor_fraction() + decomp.specific_fraction() - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_risk_contribution() {
        let model = create_test_model();
        let weights = dvector![0.2, 0.2, 0.2, 0.2, 0.2];

        let rc = model.risk_contribution(&weights).unwrap();

        // Risk contributions should sum to portfolio volatility
        let vol = model.portfolio_variance(&weights).unwrap().sqrt();
        let sum_rc: f64 = rc.iter().sum();

        assert!((sum_rc - vol).abs() < 1e-10);
    }

    #[test]
    fn test_dimension_validation() {
        let loadings = dmatrix![1.0, 0.5; 0.8, 0.6];
        let factor_cov = dmatrix![0.04]; // Wrong size

        let specific_var = dvector![0.01, 0.015];

        let result = FactorCovariance::new(loadings, factor_cov, specific_var);
        assert!(result.is_err());
    }
}
