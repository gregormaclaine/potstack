export interface PlayerGroup {
  id: number;
  name: string;
  color: string;
}

export interface PlayerBase {
  id: number;
  name: string;
  createdAt: string;
  groupId: number | null;
  group: PlayerGroup | null;
}

export interface PlayerWithStats extends PlayerBase {
  sessionCount: number;
  totalProfit: number;
  avgSessionProfit: number;
}

export interface PlayerBreakdownRow {
  playerId: number;
  name: string;
  group: PlayerGroup | null;
  sessions: number;
  totalBuyIn: number;
  totalCashOut: number;
  profit: number;
  avgProfit: number;
  maxProfit: number;
  maxLoss: number;
  winRate: number;
}

export interface GroupBreakdownRow {
  groupId: number;
  name: string;
  color: string;
  sessions: number;
  totalBuyIn: number;
  totalCashOut: number;
  profit: number;
  avgProfit: number;
  maxProfit: number;
  maxLoss: number;
  winRate: number;
}

export interface SessionPlayerDetail {
  id: number;
  playerId: number;
  playerName: string;
  group?: { id: number; name: string; color: string } | null;
  buyIn: number | null;
  cashOut: number | null;
  profit: number | null;
}

export interface SessionWithPlayers {
  id: number;
  date: string;
  location: string | null;
  notes: string | null;
  buyIn: number;
  cashOut: number;
  profit: number;
  createdAt: string;
  updatedAt: string;
  players: SessionPlayerDetail[];
  /** Present on accepted session references — excludes row from recentSessions and topPlayers */
  isAcceptedRef?: true;
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
  sessions: number;
  totalProfit: number | null;
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

export type LinkStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface PlayerLinkSummary {
  id: number;
  status: LinkStatus;
  linkedUsername: string;
  linkedUserAvatar?: string | null;
  playerId: number;
}

export interface ReceivedLinkRequest {
  id: number;
  status: LinkStatus;
  createdAt: string;
  requesterUsername: string;
  requesterAvatar?: string | null;
  playerName: string;
}

export interface SessionInviteItem {
  id: number;
  status: LinkStatus;
  createdAt: string;
  requesterUsername: string;
  requesterAvatar?: string | null;
  playerName: string;
  session: { date: string; location: string | null; notes: string | null };
  sessionPlayer: { buyIn: number | null; cashOut: number | null; profit: number | null };
}

export interface BreakdownStatsItem {
  entityType: "player" | "group";
  entityId: number;
  winRateCILow: number;
  winRateCIHigh: number;
  profitProbability: number;
  expectedValue: number;
  sessionCount: number;
  computedAt: string; // ISO string
}

export interface AcceptedSessionRef {
  id: number;
  sessionId: number;
  date: string;
  location: string | null;
  localLocation: string | null;
  notes: string | null;
  localNotes: string | null;
  inviterUsername: string;
  myBuyIn: number | null;
  myCashOut: number | null;
  myProfit: number | null;
  playerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptedSessionPlayer {
  fromPlayerId: number;
  fromPlayerName: string;
  toPlayerId: number | null;
  toPlayerName: string | null;
  buyIn: number | null;
  cashOut: number | null;
  profit: number | null;
  isMe: boolean;
  resolvedVia: "playerLink" | "equivalence" | null;
  linkedUsername: string | null;
}

// ── Notification system ───────────────────────────────────────────────────────

export type NotificationType =
  | "link_request_received"
  | "link_accepted"
  | "link_rejected_sent"       // shown to the requester whose request was rejected
  | "link_rejected_received"   // shown to the person who did the rejecting
  | "link_broken"
  | "session_invite_received"
  | "session_invite_accepted"          // shown to session owner
  | "session_invite_accepted_by_me"    // shown to the invitee who accepted
  | "session_invite_rejected"          // shown to session owner
  | "session_invite_rejected_by_me";   // shown to the invitee who rejected

export type LinkRequestReceivedData   = { requesterUsername: string; playerName: string };
export type LinkAcceptedData          = { otherUsername: string; myPlayerName: string };
export type LinkRejectedSentData      = { otherUsername: string; playerName: string };
export type LinkRejectedReceivedData  = { otherUsername: string; playerName: string };
export type LinkBrokenData            = { otherUsername: string; myPlayerName: string; theirPlayerName: string };

export type SessionInviteReceivedData = {
  inviterUsername: string;
  sessionDate: string;
  sessionLocation: string | null;
  buyIn: number | null;
  cashOut: number | null;
  profit: number | null;
};
export type SessionInviteAcceptedData       = { otherUsername: string; sessionDate: string; sessionLocation: string | null };
export type SessionInviteAcceptedByMeData   = { otherUsername: string; sessionDate: string; sessionLocation: string | null; acceptedSessionId: number };
export type SessionInviteRejectedData       = { otherUsername: string; sessionDate: string; sessionLocation: string | null };
export type SessionInviteRejectedByMeData   = { otherUsername: string; sessionDate: string; sessionLocation: string | null };

export type NotificationData =
  | ({ type: "link_request_received" }         & LinkRequestReceivedData)
  | ({ type: "link_accepted" }                 & LinkAcceptedData)
  | ({ type: "link_rejected_sent" }            & LinkRejectedSentData)
  | ({ type: "link_rejected_received" }        & LinkRejectedReceivedData)
  | ({ type: "link_broken" }                   & LinkBrokenData)
  | ({ type: "session_invite_received" }       & SessionInviteReceivedData)
  | ({ type: "session_invite_accepted" }       & SessionInviteAcceptedData)
  | ({ type: "session_invite_accepted_by_me" } & SessionInviteAcceptedByMeData)
  | ({ type: "session_invite_rejected" }       & SessionInviteRejectedData)
  | ({ type: "session_invite_rejected_by_me" } & SessionInviteRejectedByMeData);

export interface CumulativePlayerPoint {
  sessionIndex: number;
  date: string;
  [playerKey: string]: number | string; // "me" or "player_{id}" keys
}

export interface CumulativePlayerMeta {
  key: string;    // "me" or "player_42"
  name: string;   // display name
  color: string;  // hex color e.g. "#10b981"
}

export interface GroupSessionDetail {
  sessionId: number;
  date: string;
  totalPlayers: number;    // all players including user
  nonGroupPlayers: number; // opponents NOT in the selected group
  totalOnTable: number;    // sum of all known buy-ins (user + non-null opponent buy-ins)
  groupNet: number;        // sum of user profit + known group-member opponent profits
}

/** A fully-fetched notification row ready for the frontend. */
export interface NotificationRow {
  id: number;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  data: NotificationData;
  // FK ids — null means the record was deleted
  sessionId: number | null;
  linkId:    number | null;
  inviteId:  number | null;
  // Live FK status — null means the record was deleted
  link:   { status: string } | null;
  invite: { status: string } | null;
}

export interface PokerEvent {
  id: number;
  name: string;
  startDate: string; // ISO
  endDate: string; // ISO
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventBody {
  name: string;
  startDate: string;
  endDate: string;
  color?: string;
}

export interface UpdateEventBody {
  name?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
}

export interface CreateSessionBody {
  date: string;
  location?: string;
  notes?: string;
  buyIn: number;
  cashOut: number;
  players?: Array<{
    playerId: number;
    buyIn?: number | null;
    cashOut?: number | null;
  }>;
  /** If true, skip generating session invites entirely. */
  skipInvites?: boolean;
  /**
   * Player IDs for which a link was created during this form session.
   * These get invites even if the link is still PENDING.
   */
  pendingLinkPlayerIds?: number[];
}
