import { computed, inject, Injectable, signal } from '@angular/core';
import { BetEngine } from './bet-engine';
import { Computed, LiveData } from './model';

/**
 * Where the live data is fetched from.
 * Dev: served locally from `public/data.json`.
 * Prod: will point to the GitHub raw CDN (committed by the Apps Script), e.g.
 *   https://raw.githubusercontent.com/<owner>/<repo>/main/data.json
 */
const DATA_URL = 'data.json';

@Injectable({ providedIn: 'root' })
export class DataLoader {
  private readonly engine = inject(BetEngine);
  private readonly raw = signal<LiveData | null>(null);

  readonly data = this.raw.asReadonly();
  readonly status = signal<string>('Caricamento…');
  readonly errored = signal(false);

  /** Live data run through the betting engine (null until first load). */
  readonly model = computed<Computed | null>(() => {
    const d = this.raw();
    return d ? this.engine.computeAll(d) : null;
  });

  readonly updated = computed<Date | null>(() => {
    const u = this.raw()?.updated;
    return u ? new Date(u) : null;
  });

  readonly sim = computed<boolean>(() => this.raw()?.sim ?? false);

  async load(): Promise<void> {
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LiveData;
      this.raw.set(data);
      this.errored.set(false);
      this.status.set(data.status ?? 'Aggiornato');
    } catch (err) {
      this.errored.set(true);
      this.status.set('Errore nel caricamento dei dati');
    }
  }
}
