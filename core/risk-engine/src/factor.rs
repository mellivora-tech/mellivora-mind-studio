//! Factor model for risk decomposition

use nalgebra::{DMatrix, DVector};
use crate::{Result, RiskError};

/// Factor exposures for a universe of securities
pub struct FactorExposures {
    /// Security codes
    pub securities: Vec<String>,
    /// Factor names
    pub factors: Vec<String>,
    /// Exposure matrix (n_securities x n_factors)
    pub exposures: DMatrix<f64>,
    /// Specific risk for each security
    pub specific_risk: DVector<f64>,
}

impl FactorExposures {
    /// Create new factor exposures
    pub fn new(
        securities: Vec<String>,
        factors: Vec<String>,
        exposures: Vec<Vec<f64>>,
        specific_risk: Vec<f64>,
    ) -> Result<Self> {
        let n_securities = securities.len();
        let n_factors = factors.len();
        
        if exposures.len() != n_securities {
            return Err(RiskError::DimensionMismatch {
                expected: n_securities,
                actual: exposures.len(),
            });
        }
        
        if specific_risk.len() != n_securities {
            return Err(RiskError::DimensionMismatch {
                expected: n_securities,
                actual: specific_risk.len(),
            });
        }
        
        // Flatten exposures into matrix
        let flat: Vec<f64> = exposures.into_iter().flatten().collect();
        let exposures = DMatrix::from_row_slice(n_securities, n_factors, &flat);
        let specific_risk = DVector::from_vec(specific_risk);
        
        Ok(Self {
            securities,
            factors,
            exposures,
            specific_risk,
        })
    }
    
    /// Get portfolio factor exposures
    pub fn portfolio_exposures(&self, weights: &DVector<f64>) -> Result<DVector<f64>> {
        if weights.len() != self.securities.len() {
            return Err(RiskError::DimensionMismatch {
                expected: self.securities.len(),
                actual: weights.len(),
            });
        }
        
        // w' * X
        Ok(self.exposures.transpose() * weights)
    }
    
    /// Calculate portfolio specific risk
    pub fn portfolio_specific_risk(&self, weights: &DVector<f64>) -> Result<f64> {
        if weights.len() != self.securities.len() {
            return Err(RiskError::DimensionMismatch {
                expected: self.securities.len(),
                actual: weights.len(),
            });
        }
        
        // sqrt(sum(w_i^2 * sigma_i^2))
        let specific_var: f64 = weights
            .iter()
            .zip(self.specific_risk.iter())
            .map(|(w, s)| w * w * s * s)
            .sum();
        
        Ok(specific_var.sqrt())
    }
}

/// Factor covariance matrix
pub struct FactorCovariance {
    /// Factor names
    pub factors: Vec<String>,
    /// Covariance matrix (n_factors x n_factors)
    pub covariance: DMatrix<f64>,
}

impl FactorCovariance {
    /// Create new factor covariance
    pub fn new(factors: Vec<String>, covariance: Vec<Vec<f64>>) -> Result<Self> {
        let n = factors.len();
        
        if covariance.len() != n {
            return Err(RiskError::DimensionMismatch {
                expected: n,
                actual: covariance.len(),
            });
        }
        
        let flat: Vec<f64> = covariance.into_iter().flatten().collect();
        let covariance = DMatrix::from_row_slice(n, n, &flat);
        
        Ok(Self { factors, covariance })
    }
    
    /// Calculate full stock covariance matrix
    /// Sigma = X * F * X' + D
    /// where X = factor exposures, F = factor covariance, D = diagonal specific risk
    pub fn stock_covariance(
        &self,
        exposures: &FactorExposures,
    ) -> Result<DMatrix<f64>> {
        let n_stocks = exposures.securities.len();
        
        // X * F * X'
        let systematic = &exposures.exposures * &self.covariance * exposures.exposures.transpose();
        
        // Add diagonal specific risk
        let mut result = systematic;
        for i in 0..n_stocks {
            let spec_var = exposures.specific_risk[i] * exposures.specific_risk[i];
            result[(i, i)] += spec_var;
        }
        
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_portfolio_exposures() {
        let securities = vec!["A".to_string(), "B".to_string()];
        let factors = vec!["size".to_string(), "value".to_string()];
        let exposures = vec![
            vec![0.5, 0.3],   // A: size=0.5, value=0.3
            vec![-0.2, 0.8],  // B: size=-0.2, value=0.8
        ];
        let specific_risk = vec![0.02, 0.03];
        
        let factor_exp = FactorExposures::new(
            securities, factors, exposures, specific_risk
        ).unwrap();
        
        let weights = DVector::from_vec(vec![0.6, 0.4]);
        let port_exp = factor_exp.portfolio_exposures(&weights).unwrap();
        
        // Expected: [0.6*0.5 + 0.4*(-0.2), 0.6*0.3 + 0.4*0.8] = [0.22, 0.50]
        assert!((port_exp[0] - 0.22).abs() < 1e-6);
        assert!((port_exp[1] - 0.50).abs() < 1e-6);
    }
}
