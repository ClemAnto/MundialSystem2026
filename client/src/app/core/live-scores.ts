import { MatchInfo } from './model';

/**
 * ESPN's public scoreboard for the World Cup. Undocumented but CORS-open
 * (Access-Control-Allow-Origin: *) and key-less, with ~1s freshness — it carries the
 * in-play status, score and minute that the football-data.org free tier never reports.
 * The default endpoint returns the current day's slate, which always includes live matches.
 */
const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN English display name -> Italian sheet name (mirror of TEAM_NAMES in src/Codice.gs).
const TEAM_IT: Record<string, string> = {
  Mexico: 'Messico', 'South Africa': 'Sudafrica', 'South Korea': 'Corea del Sud', Czechia: 'Rep. Ceca',
  Canada: 'Canada', 'Bosnia-Herzegovina': 'Bosnia', 'Bosnia & Herzegovina': 'Bosnia', Qatar: 'Qatar', Switzerland: 'Svizzera',
  Brazil: 'Brasile', Scotland: 'Scozia', Morocco: 'Marocco', Haiti: 'Haiti',
  'United States': 'Stati Uniti', USA: 'Stati Uniti', Turkey: 'Turchia', Türkiye: 'Turchia', Paraguay: 'Paraguay', Australia: 'Australia',
  Germany: 'Germania', Ecuador: 'Ecuador', "Côte d'Ivoire": "Costa d'Avorio", 'Ivory Coast': "Costa d'Avorio", Curaçao: 'Curaçao',
  Netherlands: 'Olanda', Japan: 'Giappone', Sweden: 'Svezia', Tunisia: 'Tunisia',
  Belgium: 'Belgio', Egypt: 'Egitto', Iran: 'Iran', 'IR Iran': 'Iran', 'New Zealand': 'Nuova Zelanda',
  Spain: 'Spagna', Uruguay: 'Uruguay', 'Saudi Arabia': 'Arabia Saudita', 'Cape Verde': 'Capo Verde', 'Cabo Verde': 'Capo Verde',
  France: 'Francia', Senegal: 'Senegal', Norway: 'Norvegia', Iraq: 'Iraq',
  Argentina: 'Argentina', Austria: 'Austria', Algeria: 'Algeria', Jordan: 'Giordania',
  Portugal: 'Portogallo', Colombia: 'Colombia', 'DR Congo': 'Rd Congo', Uzbekistan: 'Uzbekistan',
  England: 'Inghilterra', Croatia: 'Croazia', Ghana: 'Ghana', Panama: 'Panama',
};

function toItalian(name: string): string {
  return TEAM_IT[name] ?? name;
}

export interface LiveScore {
  home: string;
  away: string;
  hs: number;
  as: number;
  status: string; // IN_PLAY | FINISHED (only live or finished matches are returned)
  minute?: string;
}

/** Today's live/finished World Cup matches from ESPN, with Italian team names. */
export async function fetchLiveScores(): Promise<LiveScore[]> {
  const res = await fetch(ESPN_SCOREBOARD, { cache: 'no-store' });
  if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
  const data = await res.json();
  const out: LiveScore[] = [];
  for (const ev of data.events ?? []) {
    const state = ev.status?.type?.state as string | undefined; // pre | in | post
    if (state !== 'in' && state !== 'post') continue; // skip not-yet-started
    const cs = ev.competitions?.[0]?.competitors ?? [];
    const home = cs.find((c: { homeAway?: string }) => c.homeAway === 'home');
    const away = cs.find((c: { homeAway?: string }) => c.homeAway === 'away');
    if (!home || !away) continue;
    out.push({
      home: toItalian(home.team?.displayName ?? ''),
      away: toItalian(away.team?.displayName ?? ''),
      hs: Number(home.score ?? 0),
      as: Number(away.score ?? 0),
      status: state === 'in' ? 'IN_PLAY' : 'FINISHED',
      minute: state === 'in' ? ev.status?.type?.detail : undefined,
    });
  }
  return out;
}

/** Overlay live scores onto feed matches, matched by unordered team pair. */
export function applyLiveScores(matches: MatchInfo[], live: LiveScore[]): MatchInfo[] {
  if (!live.length) return matches;
  const key = (a: string, b: string) => [a, b].sort().join('|');
  const byPair = new Map(live.map((s) => [key(s.home, s.away), s]));
  return matches.map((m) => {
    const s = byPair.get(key(m.home, m.away));
    return s ? { ...m, hs: s.hs, as: s.as, status: s.status, minute: s.minute } : m;
  });
}
