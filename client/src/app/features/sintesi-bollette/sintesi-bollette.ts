import { Component, inject, signal } from '@angular/core';
import { DataLoader } from '../../core/data-loader';
import { abbr } from '../../core/team-abbr';
import { euro } from '../../core/format';
import { BollettaState, GroupState } from '../../core/model';

/**
 * Side card with one row per bet slip (winning/losing + payout). Losing rows expand
 * to the losing selections; hovering one exposes the group letter via `hoveredGroup`
 * so the host page can highlight the related group card.
 */
@Component({
  selector: 'app-sintesi-bollette',
  imports: [],
  templateUrl: './sintesi-bollette.html',
})
export class SintesiBollette {
  protected readonly loader = inject(DataLoader);
  protected readonly abbr = abbr;
  protected readonly euro = euro;

  /** Group letter hovered in the summary (read by the host page via template ref). */
  readonly hoveredGroup = signal<string | null>(null);

  private readonly expandedSlips = signal<ReadonlySet<number>>(new Set());

  /** Groups of the slip without a currently-winning pair. */
  protected wrongGroups(b: BollettaState): number {
    return b.tot - b.satNowCount;
  }

  protected losingGroups(b: BollettaState): GroupState[] {
    return b.groups.filter((g) => !g.satNow);
  }

  /** Sum of the payouts of the currently-winning slips. */
  protected totalWon(bollette: BollettaState[]): number {
    return bollette.filter((b) => b.code > 0).reduce((sum, b) => sum + b.vincita, 0);
  }

  protected isExpanded(n: number): boolean {
    return this.expandedSlips().has(n);
  }

  protected toggleExpand(b: BollettaState): void {
    if (this.wrongGroups(b) === 0) return; // nothing to show for winning slips
    this.expandedSlips.update((set) => {
      const next = new Set(set);
      if (next.has(b.n)) next.delete(b.n);
      else next.add(b.n);
      return next;
    });
  }
}
