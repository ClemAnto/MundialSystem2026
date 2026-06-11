import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { DataLoader } from './core/data-loader';
import { WhatIf } from './core/what-if';
import { abbr } from './core/team-abbr';
import { MatchInfo } from './core/model';
import { isLiveMatch } from './core/live';
import packageJson from '../../package.json';

const REFRESH_MS = 60_000; // re-read data.json every minute (static read, no API limits)

function pad(x: number): string {
  return String(x).padStart(2, '0');
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NzMenuModule, NzIconModule, NzPopconfirmModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './styles/components/app.css',
})
export class App {
  protected readonly loader = inject(DataLoader);
  protected readonly whatIf = inject(WhatIf);
  protected readonly abbr = abbr;
  protected readonly version = packageJson.version;

  /**
   * Feed status, minus the routine "Aggiornato - ..." / "In attesa - ..." lines: those are
   * redundant with the "ultimo aggiornamento alle HH:mm" line, so only meaningful states
   * (errors, simulation, debug) are shown.
   */
  protected readonly statusText = computed(() => {
    const s = this.loader.status();
    const low = s.toLowerCase();
    return low.startsWith('in attesa') || low.startsWith('aggiornato') ? '' : s;
  });

  /**
   * First match currently being played, if any. An explicit live status wins;
   * otherwise a non-finished match inside its kick-off window counts as in progress
   * (the free football-data.org feed often stays on 'TIMED' during play).
   */
  protected readonly liveMatch = computed<MatchInfo | null>(() => {
    const matches = this.loader.data()?.matches ?? [];
    const now = this.loader.now();
    return matches.find((m) => isLiveMatch(m, now)) ?? null;
  });

  /** Next kick-off: the match plus the time left as "Ng hh:mm:ss" (null when nothing upcoming). */
  protected readonly nextMatch = computed<{ match: MatchInfo; left: string } | null>(() => {
    const matches = this.loader.data()?.matches ?? [];
    const now = this.loader.now();
    let match: MatchInfo | null = null;
    let kickoff = Infinity;
    for (const m of matches) {
      const t = new Date(m.utc ?? '').getTime();
      if (!isNaN(t) && t > now && t < kickoff) {
        kickoff = t;
        match = m;
      }
    }
    if (!match) return null;
    let s = Math.floor((kickoff - now) / 1000);
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const h = Math.floor(s / 3600);
    s -= h * 3600;
    const m = Math.floor(s / 60);
    s -= m * 60;
    return { match, left: (d > 0 ? `${d}g ` : '') + `${pad(h)}:${pad(m)}:${pad(s)}` };
  });

  constructor() {
    this.loader.load();
    setInterval(() => this.loader.load(), REFRESH_MS);
  }
}
