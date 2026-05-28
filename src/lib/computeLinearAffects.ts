import type { UnifiedSession } from '@/types';
import { fitAndPredict } from '@/lib/linearAffectsModel';
import { Matrix, SingularValueDecomposition } from 'ml-matrix';

export type LinearAffectsPlayerResult = {
  playerIds: number[];
  playerName: string;
  sessionCount: number;
  mean: number;
  ciLow: number;
  ciHigh: number;
};

export type LinearAffectsExcludedPlayer = {
  playerIds: number[];
  playerName: string;
};

export type LinearAffectsModelResult = {
  N: number;
  n: number;
  nu: number;
  sigma: number;
  alpha: number;
  players: LinearAffectsPlayerResult[];
  excludedPlayers: LinearAffectsExcludedPlayer[];
};

export type LinearAffectsError = { error: string };

export type LinearAffectsResult = LinearAffectsModelResult | LinearAffectsError;

export function isLinearAffectsError(r: LinearAffectsResult): r is LinearAffectsError {
  return 'error' in r;
}

export function computeLinearAffects(
  sessions: UnifiedSession[],
  qualifyingPlayerIds: number[],
  playerNames: Map<number, string>,
  includeRare: boolean,
  alpha = 0.1,
): LinearAffectsResult {
  if (qualifyingPlayerIds.length === 0) {
    return { error: 'No players have at least 3 sessions.' };
  }

  const qualifyingSet = new Set(qualifyingPlayerIds);

  const filteredSessions = includeRare
    ? sessions
    : sessions.filter(s =>
        s.players.every(sp => sp.playerId === null || qualifyingSet.has(sp.playerId)),
      );

  if (filteredSessions.length === 0) {
    return {
      error:
        'Every session includes at least one player with fewer than 3 sessions, so no sessions remain after filtering. Enable the toggle to include these sessions.',
    };
  }

  // Build presence booleans: presences[i][j] = true if qualifying player i appears in session j.
  const presences = qualifyingPlayerIds.map(id =>
    filteredSessions.map(s => s.players.some(sp => sp.playerId === id)),
  );

  const allOnesFp = '1'.repeat(filteredSessions.length);

  // Pass 1: identify players who appear in every filtered session.
  // Their column equals the intercept column, making XᵀX singular — exclude them before grouping.
  const excludedQualifyingIndices: number[] = [];
  const candidateIndices: number[] = [];
  for (let i = 0; i < qualifyingPlayerIds.length; i++) {
    const fp = presences[i].map(b => (b ? '1' : '0')).join('');
    if (fp === allOnesFp) {
      excludedQualifyingIndices.push(i);
    } else {
      candidateIndices.push(i);
    }
  }

  const excludedPlayers: LinearAffectsExcludedPlayer[] =
    excludedQualifyingIndices.length > 0
      ? [
          {
            playerIds: excludedQualifyingIndices.map(i => qualifyingPlayerIds[i]),
            playerName: excludedQualifyingIndices
              .map(i => playerNames.get(qualifyingPlayerIds[i]) ?? `Player ${qualifyingPlayerIds[i]}`)
              .join(' / '),
          },
        ]
      : [];

  // Pass 2: group remaining players by fingerprint.
  // Identical fingerprints = perfectly collinear → merge into one input column.
  // All-zeros fingerprint = never appeared → drop.
  const fingerprintToIndices = new Map<string, number[]>();
  for (const i of candidateIndices) {
    const fp = presences[i].map(b => (b ? '1' : '0')).join('');
    if (!fp.includes('1')) continue;
    const bucket = fingerprintToIndices.get(fp);
    if (bucket) {
      bucket.push(i);
    } else {
      fingerprintToIndices.set(fp, [i]);
    }
  }

  const mergedGroups = [...fingerprintToIndices.values()];

  // Pass 3: greedily merge near-collinear groups (Pearson |r| >= threshold).
  // Handles the case where players always appear together but not with exactly
  // identical fingerprints — causes near-singular XᵀX and numerical blowup.
  const NEAR_COLLINEAR_THRESHOLD = 0.95;

  function pearson(a: boolean[], b: boolean[]): number {
    const N = a.length;
    let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
    for (let k = 0; k < N; k++) {
      const x = a[k] ? 1 : 0, y = b[k] ? 1 : 0;
      sumA += x; sumB += y; sumAB += x * y; sumA2 += x * x; sumB2 += y * y;
    }
    const num = N * sumAB - sumA * sumB;
    const den = Math.sqrt((N * sumA2 - sumA ** 2) * (N * sumB2 - sumB ** 2));
    return den === 0 ? 1 : num / den;
  }

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < mergedGroups.length; i++) {
      for (let j = i + 1; j < mergedGroups.length; j++) {
        const presA = filteredSessions.map((_, k) => presences[mergedGroups[i][0]][k]);
        const presB = filteredSessions.map((_, k) => presences[mergedGroups[j][0]][k]);
        if (Math.abs(pearson(presA, presB)) >= NEAR_COLLINEAR_THRESHOLD) {
          mergedGroups[i] = [...mergedGroups[i], ...mergedGroups[j]];
          mergedGroups.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  if (mergedGroups.length === 0) {
    return { error: 'None of the qualifying players appeared in any of the included sessions.' };
  }

  // Pass 4: condition-number-guided merging.
  // Catches multi-way collinearity where no single pair has |r| >= the Pearson threshold
  // but the combined design matrix is still near-singular. Iteratively merges the most
  // correlated remaining pair until cond(X) is acceptable.
  const CONDITION_NUMBER_THRESHOLD = 1e6;

  function buildX(groups: number[][]): Matrix {
    return new Matrix(
      filteredSessions.map((_, j) => [1, ...groups.map(g => (presences[g[0]][j] ? 1 : 0))]),
    );
  }

  function condX(X: Matrix): number {
    const svd = new SingularValueDecomposition(X, { autoTranspose: true });
    const s = svd.diagonal;
    return s[0] / s[s.length - 1];
  }

  while (mergedGroups.length > 1 && condX(buildX(mergedGroups)) > CONDITION_NUMBER_THRESHOLD) {
    let maxR = -1, mergeI = 0, mergeJ = 1;
    for (let i = 0; i < mergedGroups.length; i++) {
      for (let j = i + 1; j < mergedGroups.length; j++) {
        const presA = filteredSessions.map((_, k) => presences[mergedGroups[i][0]][k]);
        const presB = filteredSessions.map((_, k) => presences[mergedGroups[j][0]][k]);
        const r = Math.abs(pearson(presA, presB));
        if (r > maxR) { maxR = r; mergeI = i; mergeJ = j; }
      }
    }
    mergedGroups[mergeI] = [...mergedGroups[mergeI], ...mergedGroups[mergeJ]];
    mergedGroups.splice(mergeJ, 1);
  }

  const measurements = filteredSessions.map((_, j) => ({
    inputs: mergedGroups.map(group => presences[group[0]][j]),
    output: filteredSessions[j].profit,
  }));

  const N = measurements.length;
  const n = mergedGroups.length;
  if (N < n + 1) {
    return {
      error: `Not enough sessions to fit the model: need at least ${n + 1} for ${n} player ${n === 1 ? 'group' : 'groups'}, but only ${N} ${N === 1 ? 'is' : 'are'} available after filtering.`,
    };
  }

  let fitResult;
  try {
    fitResult = fitAndPredict(measurements, alpha);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/singular/i.test(msg)) {
      return {
        error:
          "The design matrix is rank-deficient even after merging collinear players. This can happen when one combination of players always predicts another's presence.",
      };
    }
    if (/degrees of freedom/i.test(msg)) {
      return { error: 'Not enough degrees of freedom to estimate variance. Add more sessions.' };
    }
    return { error: `Model fitting failed: ${msg}` };
  }

  const players: LinearAffectsPlayerResult[] = fitResult.predictions.map(pred => {
    const group = mergedGroups[pred.inputIndex];
    const playerIds = group.map(i => qualifyingPlayerIds[i]);
    const playerName = playerIds.map(id => playerNames.get(id) ?? `Player ${id}`).join(' / ');
    return {
      playerIds,
      playerName,
      sessionCount: measurements.filter(m => m.inputs[pred.inputIndex]).length,
      mean: pred.mean,
      ciLow: pred.ciLow,
      ciHigh: pred.ciHigh,
    };
  });

  return {
    N: fitResult.N,
    n: fitResult.n,
    nu: fitResult.nu,
    sigma: fitResult.sigma,
    alpha,
    players,
    excludedPlayers,
  };
}
