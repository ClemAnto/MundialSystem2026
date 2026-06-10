import { Component, computed, inject } from '@angular/core';
import { DataLoader } from '../../core/data-loader';
import { GROUPS } from '../../core/bets-data';
import { MatchInfo } from '../../core/model';

@Component({
  selector: 'app-risultati',
  imports: [],
  templateUrl: './risultati.html',
  styleUrl: './risultati.css',
})
export class Risultati {
  protected readonly loader = inject(DataLoader);

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
}
