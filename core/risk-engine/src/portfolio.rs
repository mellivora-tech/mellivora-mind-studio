//! Portfolio risk calculation

use nalgebra::{DMatrix, DVector};
use crate::{Result, RiskError};

/// Portfolio holdings
pub struct Portfolio {
    /// Security codes
    pub securities: Vec<String>,
    /// Weights (must sum to 1)
    pub weights: DVector<f64>,
}

impl Portfolio {
    /// Create a new portfolio
    pub fn new(securities: Vec<String>, weights: Vec<f64>) -> Result<Self> {
        let n = securities.len();
        if weights.len() != n {
            return Err(RiskError::DimensionMismatch {
                expected: n,
                actual: weights.len(),
            });
        }
        
        let weights = DVector::from_vec(weights);
        
        // Check weights sum to approximately 1
        let sum = weights.sum();
        if (sum - 1.0).abs() > 1e-6 {
            return Err(RiskError::InvalidWeights(
                format!("Weights sum to {}, expected 1.0", sum)
            ));
        }
        
        Ok(Self { securities, weights })
    }
    
    /// Calculate portfolio variance given covariance matrix
    pub fn variance(&self, covariance: &DMatrix<f64>) -> Result<f64> {
        let n = self.weights.len();
        if covariance.nrows() != n || covariance.ncols() != n {
            return Err(RiskError::DimensionMismatch {
                expected: n,
                actual: covariance.nrows(),
            });
        }
        
        // w' * Sigma * w
        let var = (self.weights.transpose() * covariance * &self.weights)[(0, 0)];
        
        if var < 0.0 {
            return Err(RiskError::NonPositiveDefinite);
        }
        
        Ok(var)
    }
    
    /// Calculate portfolio standard deviation (volatility)
    pub fn volatility(&self, covariance: &DMatrix<f64>) -> Result<f64> {
        let var = self.variance(covariance)?;
        Ok(var.sqrt())
    }
    
    /// Calculate annualized volatility (assuming daily returns)
    pub fn annualized_volatility(&self, covariance: &DMatrix<f64>) -> Result<f64> {
        let daily_vol = self.volatility(covariance)?;
        Ok(daily_vol * (252.0_f64).sqrt())
    }
}

/// Risk decomposition result
pub struct RiskDecomposition {
    /// Total portfolio risk (volatility)
    pub total_risk: f64,
    /// Systematic (factor) risk
    pub systematic_risk: f64,
    /// Specific (idiosyncratic) risk
    pub specific_risk: f64,
    /// Factor risk contributions
    pub factor_contributions: Vec<FactorContribution>,
}

/// Factor contribution to risk
pub struct FactorContribution {
    /// Factor name
    pub factor_name: String,
    /// Portfolio exposure to factor
    pub exposure: f64,
    /// Contribution to total risk
    pub contribution: f64,
    /// Percentage of total risk
    pub contribution_pct: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_portfolio_variance() {
        // Simple 2-asset portfolio
        let securities = vec!["A".to_string(), "B".to_string()];
        let weights = vec![0.6, 0.4];
        let portfolio = Portfolio::new(securities, weights).unwrap();
        
        // Covariance matrix
        let cov = DMatrix::from_row_slice(2, 2, &[
            0.04, 0.01,  // A variance = 0.04, covariance = 0.01
            0.01, 0.09,  // B variance = 0.09
        ]);
        
        let var = portfolio.variance(&cov).unwrap();
        
        // Expected: 0.6^2 * 0.04 + 2 * 0.6 * 0.4 * 0.01 + 0.4^2 * 0.09
        //         = 0.0144 + 0.0048 + 0.0144 = 0.0336
        assert!((var - 0.0336).abs() < 1e-6);
    }
    
    #[test]
    fn test_invalid_weights() {
        let securities = vec!["A".to_string(), "B".to_string()];
        let weights = vec![0.5, 0.6]; // Sum = 1.1, not 1.0
        
        let result = Portfolio::new(securities, weights);
        assert!(result.is_err());
    }
}
