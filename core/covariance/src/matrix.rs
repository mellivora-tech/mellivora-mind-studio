//! Matrix utilities for covariance operations
//!
//! Provides efficient matrix operations optimized for covariance matrices.

use nalgebra::{DMatrix, DVector, SymmetricEigen};

use crate::{CovarianceError, Result};

/// Check if a matrix is symmetric
pub fn is_symmetric(matrix: &DMatrix<f64>, tol: f64) -> bool {
    if matrix.nrows() != matrix.ncols() {
        return false;
    }

    for i in 0..matrix.nrows() {
        for j in i + 1..matrix.ncols() {
            if (matrix[(i, j)] - matrix[(j, i)]).abs() > tol {
                return false;
            }
        }
    }
    true
}

/// Symmetrize a matrix by averaging with its transpose
pub fn symmetrize(matrix: &DMatrix<f64>) -> DMatrix<f64> {
    (matrix + matrix.transpose()) / 2.0
}

/// Check if a matrix is positive semi-definite
pub fn is_positive_semi_definite(matrix: &DMatrix<f64>, tol: f64) -> bool {
    if !is_symmetric(matrix, tol) {
        return false;
    }

    let eigen = SymmetricEigen::new(matrix.clone());
    eigen.eigenvalues.iter().all(|&ev| ev >= -tol)
}

/// Make a matrix positive semi-definite by clipping negative eigenvalues
pub fn make_positive_semi_definite(matrix: &DMatrix<f64>, min_eigenvalue: f64) -> DMatrix<f64> {
    let sym = symmetrize(matrix);
    let eigen = SymmetricEigen::new(sym);

    // Clip eigenvalues
    let clipped_eigenvalues: DVector<f64> = eigen
        .eigenvalues
        .map(|ev| ev.max(min_eigenvalue));

    // Reconstruct: V * D * V^T
    let v = &eigen.eigenvectors;
    let d = DMatrix::from_diagonal(&clipped_eigenvalues);

    v * d * v.transpose()
}

/// Compute the condition number of a matrix
pub fn condition_number(matrix: &DMatrix<f64>) -> f64 {
    let eigen = SymmetricEigen::new(matrix.clone());
    let eigenvalues = &eigen.eigenvalues;

    let max_ev = eigenvalues.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min_ev = eigenvalues
        .iter()
        .cloned()
        .filter(|&ev| ev > 0.0)
        .fold(f64::INFINITY, f64::min);

    if min_ev == 0.0 || min_ev == f64::INFINITY {
        return f64::INFINITY;
    }

    max_ev / min_ev
}

/// Regularize a covariance matrix to improve conditioning
pub fn regularize(matrix: &DMatrix<f64>, lambda: f64) -> DMatrix<f64> {
    let n = matrix.nrows();
    let identity = DMatrix::identity(n, n);

    // Shrinkage towards identity scaled by average variance
    let avg_var = matrix.diagonal().mean();
    let target = identity * avg_var;

    matrix * (1.0 - lambda) + target * lambda
}

/// Compute the Frobenius norm of a matrix
pub fn frobenius_norm(matrix: &DMatrix<f64>) -> f64 {
    matrix.iter().map(|x| x * x).sum::<f64>().sqrt()
}

/// Compute the trace of a matrix
pub fn trace(matrix: &DMatrix<f64>) -> f64 {
    matrix.diagonal().sum()
}

/// Convert 2D Vec to DMatrix
pub fn vec_to_dmatrix(data: &[Vec<f64>]) -> Result<DMatrix<f64>> {
    if data.is_empty() {
        return Err(CovarianceError::InvalidInput("Empty data".to_string()));
    }

    let nrows = data.len();
    let ncols = data[0].len();

    for row in data {
        if row.len() != ncols {
            return Err(CovarianceError::InvalidInput(
                "Inconsistent row lengths".to_string(),
            ));
        }
    }

    let flat: Vec<f64> = data.iter().flatten().cloned().collect();
    Ok(DMatrix::from_row_slice(nrows, ncols, &flat))
}

/// Convert DMatrix to 2D Vec
pub fn dmatrix_to_vec(matrix: &DMatrix<f64>) -> Vec<Vec<f64>> {
    (0..matrix.nrows())
        .map(|i| matrix.row(i).iter().cloned().collect())
        .collect()
}

/// Compute the inverse of a symmetric positive definite matrix
pub fn inverse_spd(matrix: &DMatrix<f64>) -> Result<DMatrix<f64>> {
    // Use Cholesky decomposition for SPD matrices
    let chol = matrix
        .clone()
        .cholesky()
        .ok_or(CovarianceError::NotPositiveSemiDefinite)?;

    Ok(chol.inverse())
}

/// Compute the square root of a symmetric positive definite matrix
pub fn matrix_sqrt(matrix: &DMatrix<f64>) -> Result<DMatrix<f64>> {
    let eigen = SymmetricEigen::new(matrix.clone());

    // Check all eigenvalues are non-negative
    for &ev in eigen.eigenvalues.iter() {
        if ev < -1e-10 {
            return Err(CovarianceError::NotPositiveSemiDefinite);
        }
    }

    // sqrt(eigenvalues)
    let sqrt_eigenvalues: DVector<f64> = eigen.eigenvalues.map(|ev| ev.max(0.0).sqrt());

    // V * sqrt(D) * V^T
    let v = &eigen.eigenvectors;
    let d = DMatrix::from_diagonal(&sqrt_eigenvalues);

    Ok(v * d * v.transpose())
}

#[cfg(test)]
mod tests {
    use super::*;
    use nalgebra::dmatrix;

    #[test]
    fn test_is_symmetric() {
        let sym = dmatrix![
            1.0, 2.0, 3.0;
            2.0, 4.0, 5.0;
            3.0, 5.0, 6.0
        ];
        assert!(is_symmetric(&sym, 1e-10));

        let asym = dmatrix![
            1.0, 2.0, 3.0;
            2.1, 4.0, 5.0;
            3.0, 5.0, 6.0
        ];
        assert!(!is_symmetric(&asym, 1e-10));
    }

    #[test]
    fn test_symmetrize() {
        let asym = dmatrix![
            1.0, 2.0;
            3.0, 4.0
        ];
        let sym = symmetrize(&asym);
        assert!(is_symmetric(&sym, 1e-10));
        assert!((sym[(0, 1)] - 2.5).abs() < 1e-10);
    }

    #[test]
    fn test_positive_semi_definite() {
        // Identity is PSD
        let identity = DMatrix::identity(3, 3);
        assert!(is_positive_semi_definite(&identity, 1e-10));

        // This should be PSD (correlation matrix)
        let corr = dmatrix![
            1.0, 0.5;
            0.5, 1.0
        ];
        assert!(is_positive_semi_definite(&corr, 1e-10));
    }

    #[test]
    fn test_make_psd() {
        // Matrix with negative eigenvalue
        let not_psd = dmatrix![
            1.0, 2.0;
            2.0, 1.0
        ];
        // eigenvalues are 3 and -1

        let psd = make_positive_semi_definite(&not_psd, 0.01);
        assert!(is_positive_semi_definite(&psd, 1e-10));
    }

    #[test]
    fn test_condition_number() {
        let identity = DMatrix::identity(3, 3);
        let cond = condition_number(&identity);
        assert!((cond - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_regularize() {
        let cov = dmatrix![
            1.0, 0.9;
            0.9, 1.0
        ];
        let reg = regularize(&cov, 0.5);

        // Should be better conditioned
        assert!(condition_number(&reg) < condition_number(&cov));
    }

    #[test]
    fn test_vec_to_dmatrix() {
        let data = vec![vec![1.0, 2.0], vec![3.0, 4.0]];

        let matrix = vec_to_dmatrix(&data).unwrap();
        assert_eq!(matrix.nrows(), 2);
        assert_eq!(matrix.ncols(), 2);
        assert_eq!(matrix[(0, 0)], 1.0);
        assert_eq!(matrix[(1, 1)], 4.0);
    }

    #[test]
    fn test_inverse_spd() {
        let matrix = dmatrix![
            2.0, 1.0;
            1.0, 2.0
        ];

        let inv = inverse_spd(&matrix).unwrap();
        let identity = &matrix * &inv;

        for i in 0..2 {
            for j in 0..2 {
                let expected = if i == j { 1.0 } else { 0.0 };
                assert!((identity[(i, j)] - expected).abs() < 1e-10);
            }
        }
    }
}
