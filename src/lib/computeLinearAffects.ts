import type { UnifiedSession } from '@/types';
import { fitAndPredict } from '@/lib/linearAffectsModel';

export type LinearAffectsPlayerResult = {
  playerIds: number[];
  playerName: string;
  sessionCount: number;
  mean: number;
  ciLow: number;
  ciHigh: number;
};

export type LinearAffectsModelResult = {
  N: number;
  n: number;
  nu: number;
  sigma: number;
  alpha: number;
  players: LinearAffectsPlayerResult[];
};

export function computeLinearAffects(
  sessions: UnifiedSession[],
  qualifyingPlayerIds: number[],
  playerNames: Map<number, string>,
  includeRare: boolean,
  alpha = 0.1,
): LinearAffectsModelResult | null {
  if (qualifyingPlayerIds.length === 0) return null;

  const qualifyingSet = new Set(qualifyingPlayerIds);

  const filteredSessions = includeRare
    ? sessions
    : sessions.filter(s =>
        s.players.every(sp => sp.playerId === null || qualifyingSet.has(sp.playerId)),
      );

  if (filteredSessions.length === 0) return null;

  // Build presence booleans: presences[i][j] = true if qualifying player i appears in session j.
  const presences = qualifyingPlayerIds.map(id =>
    filteredSessions.map(s => s.players.some(sp => sp.playerId === id)),
  );

  // Fingerprint each player by which sessions they appear in.
  // Players with identical fingerprints are perfectly collinear — merge into one input column.
  // Players who appear in no filtered sessions are dropped (zero column → rank-deficient).
  const fingerprintToIndices = new Map<string, number[]>();
  for (let i = 0; i < qualifyingPlayerIds.length; i++) {
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
  if (mergedGroups.length === 0) return null;

  const measurements = filteredSessions.map((_, j) => ({
    inputs: mergedGroups.map(group => presences[group[0]][j]),
    output: filteredSessions[j].profit,
  }));

  if (measurements.length < mergedGroups.length + 1) return null;

  let fitResult;
  try {
    fitResult = fitAndPredict(measurements, alpha);
  } catch {
    return null;
  }

  const players: LinearAffectsPlayerResult[] = fitResult.predictions.map(pred => {
    const group = mergedGroups[pred.inputIndex];
    const playerIds = group.map(i => qualifyingPlayerIds[i]);
    const playerName = playerIds
      .map(id => playerNames.get(id) ?? `Player ${id}`)
      .join(' / ');
    return {
      playerIds,
      playerName,
      sessionCount: measurements.filter(m => m.inputs[pred.inputIndex]).length,
      mean: pred.mean,
      ciLow: pred.ciLow,
      ciHigh: pred.ciHigh,
    };
  });

  return { N: fitResult.N, n: fitResult.n, nu: fitResult.nu, sigma: fitResult.sigma, alpha, players };
}
