export interface PlayerBase {
  id: number;
  name: string;
  createdAt: string;
}

export interface PlayerWithStats extends PlayerBase {
  sessionCount: number;
  totalProfit: number;
}

export interface SessionPlayerDetail {
  id: number;
  playerId: number;
  playerName: string;
  buyIn: number;
  cashOut: number;
  profit: number;
}

export interface SessionWithPlayers {
  id: number;
  date: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  players: SessionPlayerDetail[];
  totalBuyIn: number;
  totalCashOut: number;
  totalProfit: number;
}

export interface SessionSummary {
  id: number;
  date: string;
  location: string | null;
  playerCount: number;
  totalBuyIn: number;
  totalCashOut: number;
  totalProfit: number;
}

export interface ProfitOverTimePoint {
  date: string;
  sessionProfit: number;
  cumulativeProfit: number;
}

export interface WinLossPoint {
  sessionId: number;
  date: string;
  profit: number;
}

export interface TopPlayer {
  playerId: number;
  name: string;
  totalProfit: number;
  sessions: number;
}

export interface DashboardStats {
  totalSessions: number;
  totalProfit: number;
  winRate: number;
  avgProfitPerSession: number;
  biggestWin: number;
  biggestLoss: number;
  profitOverTime: ProfitOverTimePoint[];
  winLossPerSession: WinLossPoint[];
  topPlayers: TopPlayer[];
  recentSessions: SessionWithPlayers[];
}

export interface CreateSessionBody {
  date: string;
  location?: string;
  notes?: string;
  players: Array<{
    playerId: number;
    buyIn: number;
    cashOut: number;
  }>;
}
