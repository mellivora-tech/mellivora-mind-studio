//! Portfolio constraints
//!
//! Defines various constraints for portfolio optimization.

use serde::{Deserialize, Serialize};

/// Box constraints (lower and upper bounds for each asset)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoxConstraint {
    /// Lower bounds for each asset weight
    pub lower: Vec<f64>,
    /// Upper bounds for each asset weight
    pub upper: Vec<f64>,
}

impl BoxConstraint {
    /// Create new box constraints
    pub fn new(lower: Vec<f64>, upper: Vec<f64>) -> Self {
        Self { lower, upper }
    }

    /// Create uniform box constraints (same bounds for all assets)
    pub fn uniform(n: usize, lower: f64, upper: f64) -> Self {
        Self {
            lower: vec![lower; n],
            upper: vec![upper; n],
        }
    }

    /// Create long-only constraints (weights >= 0)
    pub fn long_only(n: usize) -> Self {
        Self::uniform(n, 0.0, 1.0)
    }

    /// Number of assets
    pub fn len(&self) -> usize {
        self.lower.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.lower.is_empty()
    }
}

/// Linear constraint: A * w <= b or A * w == b
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinearConstraint {
    /// Constraint matrix (m x n)
    pub matrix: Vec<Vec<f64>>,
    /// Right-hand side vector (m)
    pub rhs: Vec<f64>,
    /// Is this an equality constraint?
    pub is_equality: bool,
    /// Constraint name for debugging
    pub name: String,
}

impl LinearConstraint {
    /// Create a new linear inequality constraint (A * w <= b)
    pub fn inequality(matrix: Vec<Vec<f64>>, rhs: Vec<f64>, name: &str) -> Self {
        Self {
            matrix,
            rhs,
            is_equality: false,
            name: name.to_string(),
        }
    }

    /// Create a new linear equality constraint (A * w == b)
    pub fn equality(matrix: Vec<Vec<f64>>, rhs: Vec<f64>, name: &str) -> Self {
        Self {
            matrix,
            rhs,
            is_equality: true,
            name: name.to_string(),
        }
    }

    /// Create full investment constraint (sum of weights = 1)
    pub fn full_investment(n: usize) -> Self {
        Self::equality(vec![vec![1.0; n]], vec![1.0], "full_investment")
    }

    /// Create sector exposure constraint
    pub fn sector_exposure(
        sector_membership: &[usize],
        n_sectors: usize,
        max_exposure: f64,
    ) -> Self {
        let n = sector_membership.len();
        let mut matrix = vec![vec![0.0; n]; n_sectors];

        for (i, &sector) in sector_membership.iter().enumerate() {
            if sector < n_sectors {
                matrix[sector][i] = 1.0;
            }
        }

        let rhs = vec![max_exposure; n_sectors];
        Self::inequality(matrix, rhs, "sector_exposure")
    }

    /// Number of constraints
    pub fn n_constraints(&self) -> usize {
        self.matrix.len()
    }

    /// Number of assets
    pub fn n_assets(&self) -> usize {
        if self.matrix.is_empty() {
            0
        } else {
            self.matrix[0].len()
        }
    }
}

/// Turnover constraint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnoverConstraint {
    /// Current portfolio weights
    pub current_weights: Vec<f64>,
    /// Maximum allowed turnover (sum of |new - old|)
    pub max_turnover: f64,
}

impl TurnoverConstraint {
    /// Create a new turnover constraint
    pub fn new(current_weights: Vec<f64>, max_turnover: f64) -> Self {
        Self {
            current_weights,
            max_turnover,
        }
    }
}

/// Factor exposure constraint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactorExposureConstraint {
    /// Factor loading matrix (n_assets x n_factors)
    pub factor_loadings: Vec<Vec<f64>>,
    /// Lower bounds for factor exposures
    pub lower: Vec<f64>,
    /// Upper bounds for factor exposures
    pub upper: Vec<f64>,
    /// Factor names
    pub factor_names: Vec<String>,
}

impl FactorExposureConstraint {
    /// Create a new factor exposure constraint
    pub fn new(
        factor_loadings: Vec<Vec<f64>>,
        lower: Vec<f64>,
        upper: Vec<f64>,
        factor_names: Vec<String>,
    ) -> Self {
        Self {
            factor_loadings,
            lower,
            upper,
            factor_names,
        }
    }

    /// Number of factors
    pub fn n_factors(&self) -> usize {
        self.factor_names.len()
    }

    /// Number of assets
    pub fn n_assets(&self) -> usize {
        self.factor_loadings.len()
    }
}

/// Aggregate constraint set for portfolio optimization
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ConstraintSet {
    /// Box constraints
    pub box_constraint: Option<BoxConstraint>,
    /// Linear constraints
    pub linear_constraints: Vec<LinearConstraint>,
    /// Turnover constraint
    pub turnover_constraint: Option<TurnoverConstraint>,
    /// Factor exposure constraints
    pub factor_constraints: Option<FactorExposureConstraint>,
}

impl ConstraintSet {
    /// Create a new empty constraint set
    pub fn new() -> Self {
        Self::default()
    }

    /// Add box constraint
    pub fn with_box(mut self, constraint: BoxConstraint) -> Self {
        self.box_constraint = Some(constraint);
        self
    }

    /// Add linear constraint
    pub fn with_linear(mut self, constraint: LinearConstraint) -> Self {
        self.linear_constraints.push(constraint);
        self
    }

    /// Add turnover constraint
    pub fn with_turnover(mut self, constraint: TurnoverConstraint) -> Self {
        self.turnover_constraint = Some(constraint);
        self
    }

    /// Add factor exposure constraint
    pub fn with_factor_exposure(mut self, constraint: FactorExposureConstraint) -> Self {
        self.factor_constraints = Some(constraint);
        self
    }

    /// Create standard long-only constraints with full investment
    pub fn long_only_full_investment(n: usize) -> Self {
        Self::new()
            .with_box(BoxConstraint::long_only(n))
            .with_linear(LinearConstraint::full_investment(n))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_box_constraint() {
        let constraint = BoxConstraint::long_only(5);
        assert_eq!(constraint.len(), 5);
        assert!(constraint.lower.iter().all(|&x| x == 0.0));
        assert!(constraint.upper.iter().all(|&x| x == 1.0));
    }

    #[test]
    fn test_full_investment() {
        let constraint = LinearConstraint::full_investment(10);
        assert!(constraint.is_equality);
        assert_eq!(constraint.n_constraints(), 1);
        assert_eq!(constraint.n_assets(), 10);
        assert_eq!(constraint.rhs[0], 1.0);
    }

    #[test]
    fn test_sector_exposure() {
        // 5 assets in 2 sectors: [0, 0, 1, 1, 0]
        let sectors = vec![0, 0, 1, 1, 0];
        let constraint = LinearConstraint::sector_exposure(&sectors, 2, 0.5);

        assert_eq!(constraint.n_constraints(), 2);
        assert_eq!(constraint.n_assets(), 5);

        // Sector 0: assets 0, 1, 4
        assert_eq!(constraint.matrix[0], vec![1.0, 1.0, 0.0, 0.0, 1.0]);
        // Sector 1: assets 2, 3
        assert_eq!(constraint.matrix[1], vec![0.0, 0.0, 1.0, 1.0, 0.0]);
    }

    #[test]
    fn test_constraint_set() {
        let constraints = ConstraintSet::long_only_full_investment(10);
        assert!(constraints.box_constraint.is_some());
        assert_eq!(constraints.linear_constraints.len(), 1);
    }
}
