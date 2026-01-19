//! Covariance estimation methods
//!
//! Various estimators for covariance matrices including sample covariance
//! and shrinkage estimators.

use nalgebra::DMatrix;
use rayon::prelude::*;

use crate::matrix::{symmetrize, trace};
use crate::{CovarianceError, Result};

/// Sample covariance estimator
pub struct SampleCovariance;

impl SampleCovariance {
    /// Compute sample covariance matrix
    ///
    /// # Arguments
    /// * `returns` - Matrix of returns (n_observations x n_assets)
    /// * `ddof` - Delta degrees of freedom (0 for population, 1 for sample)
    pub fn estimate(returns: &DMatrix<f64>, ddof: usize) -> Result<DMatrix<f64>> {
        let n_obs = returns.nrows();
        let n_assets = returns.ncols();

        if n_obs <= ddof {
            return Err(CovarianceError::InsufficientObservations {
                needed: ddof + 1,
                got: n_obs,
            });
        }

        // Compute means
        let means: Vec<f64> = (0..n_assets)
            .map(|j| returns.column(j).mean())
            .collect();

        // Center the data
        let mut centered = returns.clone();
        for j in 0..n_assets {
            for i in 0..n_obs {
                centered[(i, j)] -= means[j];
            }
        }

        // Compute covariance: X^T X / (n - ddof)
        let cov = centered.transpose() * &centered / (n_obs - ddof) as f64;

        Ok(symmetrize(&cov))
    }

    /// Compute correlation matrix from returns
    pub fn correlation(returns: &DMatrix<f64>) -> Result<DMatrix<f64>> {
        let cov = Self::estimate(returns, 1)?;
        let n = cov.nrows();

        let std_devs: Vec<f64> = (0..n).map(|i| cov[(i, i)].sqrt()).collect();

        let mut corr = DMatrix::zeros(n, n);
        for i in 0..n {
            for j in 0..n {
                if std_devs[i] > 0.0 && std_devs[j] > 0.0 {
                    corr[(i, j)] = cov[(i, j)] / (std_devs[i] * std_devs[j]);
                } else if i == j {
                    corr[(i, j)] = 1.0;
                }
            }
        }

        Ok(corr)
    }
}

/// Ledoit-Wolf shrinkage estimator
///
/// Shrinks sample covariance towards a structured target (scaled identity).
/// Provides better estimation when n_observations is small relative to n_assets.
pub struct LedoitWolf;

impl LedoitWolf {
    /// Estimate covariance using Ledoit-Wolf shrinkage
    ///
    /// Returns (covariance_matrix, shrinkage_intensity)
    pub fn estimate(returns: &DMatrix<f64>) -> Result<(DMatrix<f64>, f64)> {
        let n_obs = returns.nrows();
        let n_assets = returns.ncols();

        if n_obs < 2 {
            return Err(CovarianceError::InsufficientObservations {
                needed: 2,
                got: n_obs,
            });
        }

        // Compute sample covariance
        let sample_cov = SampleCovariance::estimate(returns, 1)?;

        // Compute shrinkage target: scaled identity
        let mu = trace(&sample_cov) / n_assets as f64;
        let target = DMatrix::identity(n_assets, n_assets) * mu;

        // Compute optimal shrinkage intensity
        let shrinkage = Self::compute_shrinkage(&returns, &sample_cov, mu)?;

        // Shrunk covariance
        let cov = &sample_cov * (1.0 - shrinkage) + &target * shrinkage;

        Ok((cov, shrinkage))
    }

    /// Compute optimal shrinkage intensity
    fn compute_shrinkage(
        returns: &DMatrix<f64>,
        sample_cov: &DMatrix<f64>,
        mu: f64,
    ) -> Result<f64> {
        let n = returns.nrows() as f64;
        let p = returns.ncols();

        // Compute means
        let means: Vec<f64> = (0..p).map(|j| returns.column(j).mean()).collect();

        // Compute delta (squared Frobenius norm of sample_cov - mu*I)
        let mut delta = 0.0;
        for i in 0..p {
            for j in 0..p {
                let target_val = if i == j { mu } else { 0.0 };
                let diff = sample_cov[(i, j)] - target_val;
                delta += diff * diff;
            }
        }
        delta /= p as f64;

        // Compute beta (estimation error)
        let mut beta_sum = 0.0;
        for k in 0..returns.nrows() {
            let mut term = 0.0;
            for i in 0..p {
                for j in 0..p {
                    let x_ki = returns[(k, i)] - means[i];
                    let x_kj = returns[(k, j)] - means[j];
                    let target_val = if i == j { mu } else { 0.0 };
                    let diff = x_ki * x_kj - sample_cov[(i, j)];
                    term += (x_ki * x_kj - target_val) * diff;
                }
            }
            beta_sum += term * term;
        }

        let beta = beta_sum / (n * n * p as f64);

        // Compute gamma
        let gamma = delta;

        // Optimal shrinkage: kappa / n where kappa = (beta - gamma) / delta
        if delta == 0.0 {
            return Ok(1.0);
        }

        let kappa = (beta - gamma) / delta;
        let shrinkage = (kappa / n).clamp(0.0, 1.0);

        Ok(shrinkage)
    }
}

/// Exponentially weighted moving average covariance
pub struct EwmaCovariance {
    /// Decay factor (0 < lambda < 1)
    lambda: f64,
}

impl EwmaCovariance {
    /// Create a new EWMA estimator
    pub fn new(lambda: f64) -> Result<Self> {
        if lambda <= 0.0 || lambda >= 1.0 {
            return Err(CovarianceError::InvalidInput(
                "Lambda must be in (0, 1)".to_string(),
            ));
        }
        Ok(Self { lambda })
    }

    /// Create with half-life specification
    pub fn from_half_life(half_life: f64) -> Result<Self> {
        if half_life <= 0.0 {
            return Err(CovarianceError::InvalidInput(
                "Half-life must be positive".to_string(),
            ));
        }
        let lambda = 1.0 - (0.5_f64.ln() / half_life).exp();
        Self::new(lambda)
    }

    /// Estimate EWMA covariance
    ///
    /// # Arguments
    /// * `returns` - Matrix of returns (n_observations x n_assets), oldest first
    pub fn estimate(&self, returns: &DMatrix<f64>) -> Result<DMatrix<f64>> {
        let n_obs = returns.nrows();
        let n_assets = returns.ncols();

        if n_obs < 2 {
            return Err(CovarianceError::InsufficientObservations {
                needed: 2,
                got: n_obs,
            });
        }

        // Initialize with first observation's outer product
        let r0 = returns.row(0).transpose();
        let mut cov = &r0 * r0.transpose();

        // Update with remaining observations
        for t in 1..n_obs {
            let rt = returns.row(t).transpose();
            let outer = &rt * rt.transpose();
            cov = &cov * self.lambda + &outer * (1.0 - self.lambda);
        }

        Ok(symmetrize(&cov))
    }
}

/// Parallel covariance estimation for large matrices
pub struct ParallelCovariance;

impl ParallelCovariance {
    /// Estimate covariance in parallel
    pub fn estimate(returns: &DMatrix<f64>, ddof: usize) -> Result<DMatrix<f64>> {
        let n_obs = returns.nrows();
        let n_assets = returns.ncols();

        if n_obs <= ddof {
            return Err(CovarianceError::InsufficientObservations {
                needed: ddof + 1,
                got: n_obs,
            });
        }

        // Compute means in parallel
        let means: Vec<f64> = (0..n_assets)
            .into_par_iter()
            .map(|j| returns.column(j).mean())
            .collect();

        // Compute covariance entries in parallel
        let entries: Vec<(usize, usize, f64)> = (0..n_assets)
            .into_par_iter()
            .flat_map(|i| {
                (i..n_assets)
                    .map(|j| {
                        let mut sum = 0.0;
                        for k in 0..n_obs {
                            let xi = returns[(k, i)] - means[i];
                            let xj = returns[(k, j)] - means[j];
                            sum += xi * xj;
                        }
                        (i, j, sum / (n_obs - ddof) as f64)
                    })
                    .collect::<Vec<_>>()
            })
            .collect();

        // Build symmetric matrix
        let mut cov = DMatrix::zeros(n_assets, n_assets);
        for (i, j, val) in entries {
            cov[(i, j)] = val;
            cov[(j, i)] = val;
        }

        Ok(cov)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nalgebra::dmatrix;

    fn generate_returns() -> DMatrix<f64> {
        // 10 observations, 3 assets
        dmatrix![
            0.01, 0.02, 0.015;
            -0.005, 0.01, 0.005;
            0.02, -0.01, 0.01;
            0.005, 0.015, -0.005;
            -0.01, 0.005, 0.02;
            0.015, -0.005, 0.01;
            0.008, 0.012, -0.008;
            -0.012, 0.008, 0.015;
            0.018, -0.015, 0.005;
            0.003, 0.018, 0.012
        ]
    }

    #[test]
    fn test_sample_covariance() {
        let returns = generate_returns();
        let cov = SampleCovariance::estimate(&returns, 1).unwrap();

        assert_eq!(cov.nrows(), 3);
        assert_eq!(cov.ncols(), 3);

        // Should be symmetric
        for i in 0..3 {
            for j in i + 1..3 {
                assert!((cov[(i, j)] - cov[(j, i)]).abs() < 1e-10);
            }
        }

        // Diagonal should be positive (variances)
        for i in 0..3 {
            assert!(cov[(i, i)] > 0.0);
        }
    }

    #[test]
    fn test_correlation() {
        let returns = generate_returns();
        let corr = SampleCovariance::correlation(&returns).unwrap();

        // Diagonal should be 1
        for i in 0..3 {
            assert!((corr[(i, i)] - 1.0).abs() < 1e-10);
        }

        // Off-diagonal should be in [-1, 1]
        for i in 0..3 {
            for j in 0..3 {
                assert!(corr[(i, j)] >= -1.0 && corr[(i, j)] <= 1.0);
            }
        }
    }

    #[test]
    fn test_ledoit_wolf() {
        let returns = generate_returns();
        let (cov, shrinkage) = LedoitWolf::estimate(&returns).unwrap();

        assert!(shrinkage >= 0.0 && shrinkage <= 1.0);
        assert_eq!(cov.nrows(), 3);

        // Should be symmetric and positive variances
        for i in 0..3 {
            assert!(cov[(i, i)] > 0.0);
            for j in i + 1..3 {
                assert!((cov[(i, j)] - cov[(j, i)]).abs() < 1e-10);
            }
        }
    }

    #[test]
    fn test_ewma() {
        let returns = generate_returns();
        let ewma = EwmaCovariance::new(0.94).unwrap();
        let cov = ewma.estimate(&returns).unwrap();

        assert_eq!(cov.nrows(), 3);
        assert_eq!(cov.ncols(), 3);
    }

    #[test]
    fn test_ewma_half_life() {
        let ewma = EwmaCovariance::from_half_life(30.0).unwrap();
        assert!(ewma.lambda > 0.0 && ewma.lambda < 1.0);
    }

    #[test]
    fn test_parallel_covariance() {
        let returns = generate_returns();
        let cov = ParallelCovariance::estimate(&returns, 1).unwrap();
        let cov_seq = SampleCovariance::estimate(&returns, 1).unwrap();

        // Should match sequential version
        for i in 0..3 {
            for j in 0..3 {
                assert!((cov[(i, j)] - cov_seq[(i, j)]).abs() < 1e-10);
            }
        }
    }
}
