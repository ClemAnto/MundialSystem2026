/** Short 3-4 letter codes for the teams, for the compact Tabellone view. */
const TEAM_ABBR: Record<string, string> = {
  Messico: 'MES', Sudafrica: 'SUD', 'Corea del Sud': 'COR', 'Rep. Ceca': 'CEC',
  Canada: 'CAN', Bosnia: 'BOS', Qatar: 'QAT', Svizzera: 'SVI',
  Brasile: 'BRA', Scozia: 'SCO', Marocco: 'MAR', Haiti: 'HAI',
  'Stati Uniti': 'USA', Turchia: 'TUR', Paraguay: 'PAR', Australia: 'AUS',
  Germania: 'GER', Ecuador: 'ECU', "Costa d'Avorio": 'CAV', 'Curaçao': 'CUR',
  Olanda: 'OLA', Giappone: 'GIA', Svezia: 'SVE', Tunisia: 'TUN',
  Belgio: 'BEL', Egitto: 'EGI', Iran: 'IRA', 'Nuova Zelanda': 'NZL',
  Spagna: 'SPA', Uruguay: 'URU', 'Arabia Saudita': 'ARA', 'Capo Verde': 'CAP',
  Francia: 'FRA', Senegal: 'SEN', Norvegia: 'NOR', Iraq: 'IRQ',
  Argentina: 'ARG', Austria: 'AUT', Algeria: 'ALG', Giordania: 'GIO',
  Portogallo: 'POR', Colombia: 'COL', 'Rd Congo': 'RDC', Uzbekistan: 'UZB',
  Inghilterra: 'ING', Croazia: 'CRO', Ghana: 'GHA', Panama: 'PAN',
};

/** 3-4 letter code; falls back to the first 3 letters if a team is unknown. */
export function abbr(team: string): string {
  return TEAM_ABBR[team] ?? team.slice(0, 3).toUpperCase();
}
