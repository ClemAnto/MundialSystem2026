import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DataLoader } from '../../core/data-loader';
import { GROUPS } from '../../core/bets-data';
import { GironeView, MatchInfo } from '../../core/model';
import { matchKey, WhatIf } from '../../core/what-if';
import { obbligoRowBg } from '../../core/colors';
import { SintesiBollette } from '../sintesi-bollette/sintesi-bollette';

@Component({
  selector: 'app-risultati',
  imports: [NzIconModule, SintesiBollette],
  templateUrl: './risultati.html',
  styleUrl: './risultati.css',
})
export class Risultati {
  protected readonly loader = inject(DataLoader);
  protected readonly whatIf = inject(WhatIf);
  protected readonly rowBg = obbligoRowBg;
  /** Summary card instance: exposes the hovered group to highlight its card. */
  protected readonly sintesi = viewChild.required(SintesiBollette);

  /** Matches grouped by group letter, in official group order, sorted by kick-off. */
  protected readonly byGroup = computed(() => {
    const matches = this.loader.data()?.matches ?? [];
    const map = new Map<string, MatchInfo[]>();
    for (const m of matches) {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    }
    return GROUPS.map((g) => g.letter)
      .filter((letter) => map.has(letter))
      .map((letter) => ({
        letter,
        matches: map.get(letter)!.slice().sort((a, b) => (a.utc ?? '').localeCompare(b.utc ?? '')),
      }));
  });

  protected played(m: MatchInfo): boolean {
    return (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') && m.hs != null;
  }

  // ---- collapsible mini standings per group ----

  private readonly standingsByLetter = computed(
    () => new Map((this.loader.model()?.gironi ?? []).map((g) => [g.letter, g])),
  );
  private readonly openStandings = signal<ReadonlySet<string>>(new Set());

  protected standings(letter: string): GironeView | undefined {
    return this.standingsByLetter().get(letter);
  }

  protected isStandingsOpen(letter: string): boolean {
    return this.openStandings().has(letter);
  }

  protected toggleStandings(letter: string): void {
    this.openStandings.update((set) => {
      const next = new Set(set);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }

  // ---- what-if score editing ----

  protected isCustom(m: MatchInfo): boolean {
    return matchKey(m) in this.whatIf.activeMatchScores();
  }

  /** Displayed goals: custom score first, then the real one, else 0. */
  protected goals(m: MatchInfo, side: 'hs' | 'as'): number {
    return this.whatIf.activeMatchScores()[matchKey(m)]?.[side] ?? m[side] ?? 0;
  }

  /** Add delta to one side of the score (kicks in the recompute chain). */
  protected bump(m: MatchInfo, side: 'hs' | 'as', delta: number): void {
    const hs = this.goals(m, 'hs') + (side === 'hs' ? delta : 0);
    const as = this.goals(m, 'as') + (side === 'as' ? delta : 0);
    this.whatIf.setMatchScore(matchKey(m), hs, as);
  }
}
