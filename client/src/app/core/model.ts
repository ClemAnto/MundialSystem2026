/** Domain model: static bet data + dynamic live data + computed states. */

// ---------------------------------------------------------------- static (generated from Python)
export interface Selezione {
  grp: string;
  t1: string;
  t2: string;
  q: number;
}

export interface Bolletta {
  n: number;
  stake: number;
  ncomb: number;
  imp: number;
  vmin: number;
  vmax: number;
  sel: Selezione[];
}

export interface Group {
  letter: string;
  teams: string[];
}

// ---------------------------------------------------------------- dynamic (data.json, written by Apps Script)
export interface TeamStanding {
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  /** Official position from the API; 0/undefined → computed by score. */
  pos?: number;
}

export type Standings = Record<string, TeamStanding>;

export interface MatchInfo {
  group: string;
  home: string;
  away: string;
  /** Home/away score; undefined if not played yet. */
  hs?: number;
  as?: number;
  status: string;
  utc?: string;
  /** Live clock from the ESPN overlay (e.g. "22'", "Halftime"); set only while in play. */
  minute?: string;
}

export interface LiveData {
  updated?: string;
  status?: string;
  source?: string;
  sim?: boolean;
  standings: Standings;
  matches: MatchInfo[];
}

// ---------------------------------------------------------------- computed
export interface TeamState {
  team: string;
  group: string;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pg: number;
  pts: number;
  dr: number;
  maxPts: number;
  pos: number;
  qual: boolean;
  elim: boolean;
}

export interface SelState {
  grp: string;
  t1: string;
  t2: string;
  q: number;
  /** Displayed outcome: what-if override if present, else the real one. */
  bothQual: boolean;
  /** Real (non-overridden) outcome: lets the UI drop an override that matches reality. */
  realQual: boolean;
  dead: boolean;
}

/** Per-group outcome inside a bet slip. code: 2 won, -2 lost, 1 winning, -1 losing. */
export interface GroupState {
  grp: string;
  sels: SelState[];
  code: number;
  satNow: boolean;
  satClosed: boolean;
  unsat: boolean;
}

export interface BollettaState {
  n: number;
  imp: number;
  stake: number;
  groups: GroupState[];
  tot: number;
  satNowCount: number;
  /** 2 won (def.), -2 lost (def.), 1 winning (prov.), -1 losing (prov.). */
  code: number;
  stato: string;
  definitivo: boolean;
  /** Current potential payout (stake x quotes of the currently-winning pairs). */
  vincita: number;
  /** Theoretical max payout (stake x the highest quote of each group). */
  vmax: number;
  /** Still-achievable max payout (best quote among the pairs still alive per group);
   *  0 once the slip can no longer be won. Equals vmax before any group is decided. */
  vmaxLive: number;
}

/** One row of a group card in the Gironi view. */
export interface GironeRow {
  team: string;
  pos: number;
  pts: number;
  rim: number;
  obbligo: number; // 1 must pass, -1 must not, 0 neutral
  icon: string;
}

export interface GironeView {
  letter: string;
  rows: GironeRow[];
  /** True when the ranking comes from a what-if drag, not from real data. */
  custom: boolean;
}

export interface Computed {
  teams: Record<string, TeamState>;
  closed: Record<string, boolean>;
  bollette: BollettaState[];
  gironi: GironeView[];
}
