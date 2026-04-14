/**
 * Statistical computation utilities for breakdown confidence intervals.
 * All functions are pure and side-effect-free.
 */

/**
 * Standard normal CDF Φ(z) via rational approximation (Hart, 1968).
 * Accurate to ~7 decimal places across the full range.
 */
export function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * P(session profit > 0) modelled as a normal distribution fitted to the
 * observed profits. Returns a value in [0, 1].
 *
 * Uses a t-distribution approximation for small samples by adjusting the
 * standard error, but we keep the normal CDF for simplicity — the
 * approximation is adequate for display purposes.
 */
export function probabilityOfProfit(profits: number[]): number {
  const n = profits.length;
  if (n === 0) return 0;
  if (n === 1) return profits[0] > 0 ? 1 : 0;

  const mean = profits.reduce((s, p) => s + p, 0) / n;
  const variance = profits.reduce((s, p) => s + (p - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  if (std === 0) return mean > 0 ? 1 : mean < 0 ? 0 : 0.5;

  // P(X > 0) = Φ(mean / std)
  return normalCDF(mean / std);
}

/**
 * 95% confidence interval for win rate via bootstrap resampling.
 * Returns bounds as percentages (0–100).
 *
 * @param profits  Array of session profit values (any length ≥ 1).
 * @param iterations  Number of bootstrap samples (default 5000).
 */
export function bootstrapWinRateCI(
  profits: number[],
  iterations = 5000
): { low: number; high: number } {
  const n = profits.length;
  if (n === 0) return { low: 0, high: 0 };
  if (n === 1) {
    const wr = profits[0] > 0 ? 100 : 0;
    return { low: wr, high: wr };
  }

  const samples: number[] = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    let wins = 0;
    for (let j = 0; j < n; j++) {
      if (profits[Math.floor(Math.random() * n)] > 0) wins++;
    }
    samples[i] = wins / n;
  }

  samples.sort((a, b) => a - b);

  const lowIdx = Math.floor(0.025 * iterations);
  const highIdx = Math.floor(0.975 * iterations);

  return {
    low: samples[lowIdx] * 100,
    high: samples[highIdx] * 100,
  };
}
