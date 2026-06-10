import { computed, inject, Injectable, signal } from '@angular/core';
import { BetEngine } from './bet-engine';
import { Computed, LiveData } from './model';
import { WhatIf } from './what-if';

/**
 * Where the live data is fetched from: the Google Sheet "Feed" tab published as CSV.
 * The cell A1 holds the whole JSON payload (written by the Apps Script publishData()).
 * Google serves it with `Access-Control-Allow-Origin: *` -> readable cross-origin, no token,
 * unlimited reads. For a local sample instead, set this to 'data.json'.
 */
const DATA_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSs0L-XbRGCgkiUzDqWVRXJ5cONx72Na5BOMUpZDZxtJo2JTx5B5gG54iNXEfXoUIf9AAb13mm-J1qH/pub?gid=1925420550&single=true&output=csv';

/** The Feed CSV is the JSON payload in a single CSV-escaped cell: unwrap quotes, then parse. */
function parseFeed(text: string): LiveData {
  let t = text.replace(/^﻿/, '').trim();
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).replace(/""/g, '"');
  return JSON.parse(t) as LiveData;
}

@Injectable({ providedIn: 'root' })
export class DataLoader {
  private readonly engine = inject(BetEngine);
  private readonly whatIf = inject(WhatIf);
  private readonly raw = signal<LiveData | null>(null);

  readonly data = this.raw.asReadonly();
  readonly status = signal<string>('Caricamento…');
  readonly errored = signal(false);

  /** Live data run through the betting engine (null until first load). */
  readonly model = computed<Computed | null>(() => {
    const d = this.raw();
    return d
      ? this.engine.computeAll(
          d,
          this.whatIf.activeOverrides(),
          this.whatIf.activeGroupOrders(),
          this.whatIf.activeMatchScores(),
        )
      : null;
  });

  readonly updated = computed<Date | null>(() => {
    const u = this.raw()?.updated;
    return u ? new Date(u) : null;
  });

  readonly sim = computed<boolean>(() => this.raw()?.sim ?? false);

  async load(): Promise<void> {
    try {
      const sep = DATA_URL.includes('?') ? '&' : '?';
      const res = await fetch(`${DATA_URL}${sep}t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = parseFeed(await res.text());
      this.raw.set(data);
      this.errored.set(false);
      this.status.set(data.status ?? 'Aggiornato');
    } catch (err) {
      this.errored.set(true);
      this.status.set('Errore nel caricamento dei dati');
    }
  }
}
