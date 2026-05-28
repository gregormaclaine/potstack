/**
 * Linear main-effects model for boolean inputs.
 *
 * MODEL
 *   Y = β₀ + β₁x₁ + ... + βₙxₙ + ε,   ε ~ N(0, σ²)
 *   Each xᵢ is 0/1. Assumes additive effects (no interactions) and constant variance.
 *
 * METHOD
 *   1. Build design matrix X (N × (n+1)): first column all 1s (intercept), rest are 0/1 inputs.
 *   2. Fit by OLS via QR decomposition: β̂ = R⁻¹ Qᵀ y. (QR is more numerically stable than (XᵀX)⁻¹XᵀY.)
 *   3. Estimate noise: σ̂² = RSS / ν, where ν = N − n − 1 (residual degrees of freedom).
 *   4. For a query x*, augment with a leading 1 to get x*_aug. Then:
 *        μ̂(x*) = x*_aug · β̂
 *        SE     = σ̂ · sqrt(x*_aug · (XᵀX)⁻¹ · x*_augᵀ)
 *        CI     = μ̂ ± t_{1−α/2, ν} · SE         (CI for the *mean response*, not a new observation)
 *   5. Predict for each unit vector eᵢ = [0,...,1,...,0] (1 in position i).
 *
 * REQUIREMENTS
 *   - N ≥ n + 1 measurements.
 *   - X must have full column rank (no two inputs perfectly correlated in the data).
 */

import { Matrix, QrDecomposition, inverse } from 'ml-matrix';
import tQuantile from '@stdlib/stats-base-dists-t-quantile';

type Measurement = { inputs: boolean[]; output: number };

type PredictionResult = {
  inputIndex: number;
  mean: number;
  se: number;
  ciLow: number;
  ciHigh: number;
};

type FitResult = {
  N: number;
  n: number;
  nu: number;
  sigma: number;
  tCrit: number;
  predictions: PredictionResult[];
};

export function fitAndPredict(measurements: Measurement[], alpha: number): FitResult {
  const N = measurements.length;
  const n = measurements[0].inputs.length;
  if (N < n + 1) throw new Error(`Need at least ${n + 1} measurements; got ${N}.`);

  // Build X (N × (n+1)) and y (N × 1).
  const X = new Matrix(measurements.map(m => [1, ...m.inputs.map(b => (b ? 1 : 0))]));
  const y = Matrix.columnVector(measurements.map(m => m.output));

  // Fit β̂ via QR.
  const qr = new QrDecomposition(X);
  const beta = qr.solve(y); // (n+1) × 1

  // Residuals and σ̂².
  const residuals = Matrix.sub(y, X.mmul(beta));
  const rss = residuals.to1DArray().reduce((s, r) => s + r * r, 0);
  const nu = N - n - 1;
  if (nu < 1) throw new Error('Not enough degrees of freedom to estimate variance.');
  const sigma2 = rss / nu;
  const sigma = Math.sqrt(sigma2);

  // (XᵀX)⁻¹ for the SE formula.
  const xtxInv = inverse(X.transpose().mmul(X));

  // Two-sided t critical value.
  const tCrit = tQuantile(1 - alpha / 2, nu);

  // Predict for each unit vector eᵢ.
  const predictions: PredictionResult[] = [];
  for (let i = 0; i < n; i++) {
    const xStar = Array(n + 1).fill(0);
    xStar[0] = 1; // intercept
    xStar[i + 1] = 1; // input i is true, all others false
    const xStarRow = Matrix.rowVector(xStar);

    const mean = xStarRow.mmul(beta).get(0, 0);
    const varMean = sigma2 * xStarRow.mmul(xtxInv).mmul(xStarRow.transpose()).get(0, 0);
    const se = Math.sqrt(varMean);
    const half = tCrit * se;

    predictions.push({ inputIndex: i, mean, se, ciLow: mean - half, ciHigh: mean + half });
  }

  return { N, n, nu, sigma, tCrit, predictions };
}
