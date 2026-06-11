import { Injectable } from '@angular/core';
import { GROUPS, BOLLETTE } from './bets-data';
import { matchKey, MatchScore, selKey } from './what-if';
import {
  BollettaState,
  Computed,
  GironeRow,
  GironeView,
  GroupState,
  LiveData,
  MatchInfo,
  SelState,
  Standings,
  TeamState,
} from './model';

/**
 * Replays the verified betting logic of the Excel sheet, client-side.
 * Market: "Accoppiata Passaggio Turno - Non in Ordine" = the two teams that finish
 * in the top 2 of a group (order irrelevant).
 */
@Injectable({ providedIn: 'root' })
export class BetEngine {
  // ---- static indexes (built once from the bet data) ----
  private readonly teamGroup: Record<string, string> = {};
  private readonly teamGlobalIdx: Record<string, number> = {};
  private readonly groupTeams: Record<string, string[]> = {};
  private readonly totalTeams: number;
  /** how many times a team appears across all bet selections */
  private readonly teamApp: Record<string, number> = {};
  /** total selection rows per group across all bet slips */
  private readonly groupTot: Record<string, number> = {};

  constructor() {
    let gi = 0;
    for (const g of GROUPS) {
      this.groupTeams[g.letter] = g.teams;
      for (const t of g.teams) {
        this.teamGroup[t] = g.letter;
        this.teamGlobalIdx[t] = gi++;
      }
    }
    this.totalTeams = gi;
    for (const b of BOLLETTE) {
      for (const s of b.sel) {
        this.groupTot[s.grp] = (this.groupTot[s.grp] ?? 0) + 1;
        this.teamApp[s.t1] = (this.teamApp[s.t1] ?? 0) + 1;
        this.teamApp[s.t2] = (this.teamApp[s.t2] ?? 0) + 1;
      }
    }
  }

  /** Global obligation (aggregated over all slips): 1 must pass, -1 must not, 0 neutral. */
  private obbligoCode(team: string): number {
    const tot = this.groupTot[this.teamGroup[team]] ?? 0;
    const app = this.teamApp[team] ?? 0;
    if (tot === 0) return 0;
    if (app === 0) return -1;
    if (app >= tot) return 1;
    return 0;
  }

  private obbligoIcon(team: string): string {
    const tot = this.groupTot[this.teamGroup[team]] ?? 0;
    const app = this.teamApp[team] ?? 0;
    if (tot === 0) return '';
    if (app === 0) return '⛔';
    if (app >= tot) return '✅';
    return '·';
  }

  // ---- dynamic computation ----

  /**
   * What-if: replay the custom match scores on top of the real standings.
   * For matches whose real result is already counted (FINISHED) the real result is
   * removed first; live/scheduled matches are assumed not to be in the standings yet.
   * Returns the groups whose official API positions are now stale (recomputed by rank).
   */
  private applyMatchScores(
    base: Standings,
    matches: MatchInfo[],
    matchScores: Record<string, MatchScore>,
  ): { standings: Standings; stalePos: Set<string> } {
    const stalePos = new Set<string>();
    if (Object.keys(matchScores).length === 0) return { standings: base, stalePos };

    const standings: Standings = {};
    for (const t of Object.keys(this.teamGroup)) {
      standings[t] = { ...(base[t] ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 }) };
    }
    const addResult = (home: string, away: string, hs: number, as: number, sign: number) => {
      const h = standings[home];
      const a = standings[away];
      if (!h || !a) return;
      h.w += sign * (hs > as ? 1 : 0); h.d += sign * (hs === as ? 1 : 0); h.l += sign * (hs < as ? 1 : 0);
      h.gf += sign * hs; h.ga += sign * as;
      a.w += sign * (as > hs ? 1 : 0); a.d += sign * (hs === as ? 1 : 0); a.l += sign * (as < hs ? 1 : 0);
      a.gf += sign * as; a.ga += sign * hs;
    };
    for (const m of matches) {
      const ov = matchScores[matchKey(m)];
      if (!ov) continue;
      if (m.status === 'FINISHED' && m.hs != null && m.as != null) addResult(m.home, m.away, m.hs, m.as, -1);
      addResult(m.home, m.away, ov.hs, ov.as, 1);
      const grp = this.teamGroup[m.home] ?? m.group;
      if (grp) stalePos.add(grp);
    }
    return { standings, stalePos };
  }

  private computeTeams(
    standings: Standings,
    stalePos: Set<string>,
  ): { teams: Record<string, TeamState>; closed: Record<string, boolean> } {
    const teams: Record<string, TeamState> = {};
    const score: Record<string, number> = {};
    for (const team of Object.keys(this.teamGroup)) {
      const s = standings[team] ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      const w = s.w || 0, d = s.d || 0, l = s.l || 0, gf = s.gf || 0, ga = s.ga || 0;
      const pg = w + d + l, pts = w * 3 + d, dr = gf - ga;
      const maxPts = pts + (3 - pg) * 3;
      // deterministic score: pts -> dr -> gf -> table order (earlier team wins ties)
      score[team] = pts * 1e9 + (dr + 1000) * 1e5 + gf * 100 + (this.totalTeams - this.teamGlobalIdx[team]);
      teams[team] = {
        team, group: this.teamGroup[team], w, d, l, gf, ga,
        pg, pts, dr, maxPts, pos: 0, qual: false, elim: false,
      };
    }
    // Official positions are trustworthy only when a group forms a full 1-2-3-4 ranking.
    // football-data reports pos=1 for every team tied on 0 games early on, which would
    // mark almost everyone as qualified (pos <= 2); in that case fall back to our rank.
    const officialValid: Record<string, boolean> = {};
    for (const letter of Object.keys(this.groupTeams)) {
      const ps = this.groupTeams[letter]
        .map((t) => standings[t]?.pos ?? 0)
        .sort((a, b) => a - b);
      officialValid[letter] = ps[0] === 1 && ps[1] === 2 && ps[2] === 3 && ps[3] === 4;
    }

    // position: official if it forms a valid ranking (and still meaningful), else rank by score
    for (const team of Object.keys(teams)) {
      const me = teams[team];
      const posUff =
        officialValid[me.group] && !stalePos.has(me.group) ? standings[team]?.pos ?? 0 : 0;
      let rank = 1, elimCount = 0;
      for (const other of this.groupTeams[me.group]) {
        if (other === team) continue;
        if (score[other] > score[team]) rank++;
        if (teams[other].pts > me.maxPts) elimCount++;
      }
      me.pos = posUff > 0 ? posUff : rank;
      me.qual = me.pos <= 2;
      me.elim = elimCount >= 2;
    }
    // group "closed" = all 4 teams have played 3 matches
    const closed: Record<string, boolean> = {};
    for (const letter of Object.keys(this.groupTeams)) {
      closed[letter] = this.groupTeams[letter].every((t) => teams[t].pg === 3);
    }
    return { teams, closed };
  }

  private computeBolletta(
    b: typeof BOLLETTE[number],
    teams: Record<string, TeamState>,
    closed: Record<string, boolean>,
    overrides: Record<string, boolean>,
  ): BollettaState {
    const order: string[] = [];
    const byGroup: Record<string, SelState[]> = {};
    for (const s of b.sel) {
      if (!byGroup[s.grp]) { byGroup[s.grp] = []; order.push(s.grp); }
      // what-if override: forced true wins over eliminations, forced false acts as a real miss
      const ov = overrides[selKey(b.n, s.grp, s.t1, s.t2)];
      const bothQual = ov ?? (teams[s.t1].qual && teams[s.t2].qual);
      const dead = ov === true
        ? false
        : teams[s.t1].elim || teams[s.t2].elim || (closed[s.grp] && !bothQual);
      byGroup[s.grp].push({ grp: s.grp, t1: s.t1, t2: s.t2, q: s.q, bothQual, dead });
    }

    const groups: GroupState[] = order.map((grp) => {
      const sels = byGroup[grp];
      const nSel = sels.length;
      const satNow = sels.some((x) => x.bothQual);
      const deadCount = sels.filter((x) => x.dead).length;
      const isClosed = closed[grp];
      const satClosed = satNow && isClosed;
      const unsat = nSel > 0 && deadCount === nSel;
      const code = satClosed ? 2 : unsat ? -2 : satNow ? 1 : -1;
      return { grp, sels, code, satNow, satClosed, unsat };
    });

    const tot = groups.length;
    const satNowCount = groups.filter((g) => g.satNow).length;
    const satClosedCount = groups.filter((g) => g.satClosed).length;
    const unsatCount = groups.filter((g) => g.unsat).length;
    const code = satClosedCount === tot ? 2 : unsatCount > 0 ? -2 : satNowCount === tot ? 1 : -1;
    const stato =
      code === 2 ? 'VINCENTE (def.)' :
      code === -2 ? 'PERDENTE (def.)' :
      code === 1 ? 'Vincente (provv.)' : 'Perdente (provv.)';
    const definitivo = code === 2 || code === -2;
    // current payout = stake x product of the quotes of the currently-winning selections
    let prod = 1;
    for (const g of groups) for (const s of g.sels) if (s.bothQual) prod *= s.q;
    const vincita = b.stake * prod;

    return { n: b.n, imp: b.imp, stake: b.stake, groups, tot, satNowCount, code, stato, definitivo, vincita };
  }

  /** What-if: force the ranking of the dragged groups to the user-chosen order. */
  private applyGroupOrders(
    teams: Record<string, TeamState>,
    groupOrders: Record<string, string[]>,
  ): void {
    for (const letter of Object.keys(groupOrders)) {
      groupOrders[letter].forEach((name, i) => {
        const t = teams[name];
        if (!t) return;
        t.pos = i + 1;
        t.qual = t.pos <= 2;
        t.elim = false; // imagined ranking: real eliminations no longer apply
      });
    }
  }

  private computeGironi(
    teams: Record<string, TeamState>,
    groupOrders: Record<string, string[]>,
  ): GironeView[] {
    return GROUPS.map((g) => {
      const rows: GironeRow[] = g.teams
        .map((t) => teams[t])
        .slice()
        .sort((a, b) => a.pos - b.pos)
        .map((t) => ({
          team: t.team,
          pos: t.pos,
          pts: t.pts,
          rim: Math.max(0, 3 - t.pg),
          obbligo: this.obbligoCode(t.team),
          icon: this.obbligoIcon(t.team),
        }));
      return { letter: g.letter, rows, custom: !!groupOrders[g.letter] };
    });
  }

  computeAll(
    data: LiveData,
    overrides: Record<string, boolean> = {},
    groupOrders: Record<string, string[]> = {},
    matchScores: Record<string, MatchScore> = {},
  ): Computed {
    const { standings, stalePos } = this.applyMatchScores(
      data.standings ?? {},
      data.matches ?? [],
      matchScores,
    );
    const { teams, closed } = this.computeTeams(standings, stalePos);
    this.applyGroupOrders(teams, groupOrders); // custom rankings always win over match scores
    const bollette = BOLLETTE.map((b) => this.computeBolletta(b, teams, closed, overrides));
    const gironi = this.computeGironi(teams, groupOrders);
    return { teams, closed, bollette, gironi };
  }
}
