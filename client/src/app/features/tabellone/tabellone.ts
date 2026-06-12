import { Component, inject, signal } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { DataLoader } from '../../core/data-loader';
import { abbr } from '../../core/team-abbr';
import { selKey, WhatIf } from '../../core/what-if';
import { euro } from '../../core/format';
import { BollettaState, GroupState, SelState } from '../../core/model';
import { OUTCOME, OUTCOME_DARKER } from '../../core/colors';

@Component({
  selector: 'app-tabellone',
  imports: [NzTooltipModule],
  templateUrl: './tabellone.html',
  styleUrl: '../../styles/components/tabellone.css',
})
export class Tabellone {
  protected readonly loader = inject(DataLoader);
  protected readonly whatIf = inject(WhatIf);
  protected readonly abbr = abbr;

  /** Betting pool: 13 players, each chipped in a 5 € share. */
  protected readonly players = 13;
  protected readonly share = 5;

  /** True while the "Bottino potenziale" stat is hovered: highlights the linked slip(s). */
  protected readonly bottinoHover = signal(false);

  // The 9 slips are mutually exclusive (one real outcome can satisfy at most one
  // slip), so the pool wins at most ONE slip — we take the best slip, never a sum.

  /** Best potential payout among the slips (only one slip can ever win, so it's the
   *  max, never a sum). vincita is already 0 for slips that can no longer be won. */
  protected potentialBottino(bollette: BollettaState[]): number {
    return bollette.reduce((max, b) => Math.max(max, b.vincita), 0);
  }

  /** Potential bottino split across the players. */
  protected perPlayer(bollette: BollettaState[]): number {
    return this.potentialBottino(bollette) / this.players;
  }

  /** Net result per player: winnings share minus the 5 € they put in. */
  protected netPerPlayer(bollette: BollettaState[]): number {
    return this.perPlayer(bollette) - this.share;
  }

  /** Best payout still achievable among the slips still in play (only one can win). */
  protected maxBottino(bollette: BollettaState[]): number {
    return bollette.reduce((max, b) => Math.max(max, b.vmaxLive), 0);
  }

  /** The realizable-dream net per player: best achievable share minus the 5 € put in. */
  protected maxNetPerPlayer(bollette: BollettaState[]): number {
    return this.maxBottino(bollette) / this.players - this.share;
  }

  /**
   * Edit mode only: flip the check of the clicked selection and recompute.
   * Overrides are keyed by group+pair (not by slip), so the choice applies to that
   * pair in every slip. Activating a pair also clears the other pairs of the group
   * across all slips: only one pair can finish in a group's top 2.
   */
  protected onRowClick(s: SelState): void {
    if (!this.whatIf.editMode()) return;
    const turningOn = !s.bothQual;
    this.applyOutcome(s, turningOn);
    if (turningOn) this.deactivateOthers(s);
  }

  protected isOverridden(s: SelState): boolean {
    return selKey(s.grp, s.t1, s.t2) in this.whatIf.activeOverrides();
  }

  /** True when any pair of the group carries a what-if override. */
  protected groupCustomized(g: GroupState): boolean {
    return g.sels.some((s) => this.isOverridden(s));
  }

  /**
   * Restore the whole group to real data (drops every override of the group, across
   * all slips): real standings already have at most one active pair, so the
   * one-pair-per-group rule holds and the customized style clears everywhere.
   */
  protected resetGroup(event: MouseEvent, g: GroupState): void {
    event.stopPropagation();
    for (const s of this.groupPairs(g.grp)) {
      this.whatIf.clearSel(selKey(s.grp, s.t1, s.t2));
    }
  }

  /** Force every pair of the group except the kept pair to inactive, across all slips. */
  private deactivateOthers(kept: SelState): void {
    for (const other of this.groupPairs(kept.grp)) {
      if (other.t1 === kept.t1 && other.t2 === kept.t2) continue;
      if (other.bothQual) this.applyOutcome(other, false);
    }
  }

  /** Every pair appearing in a group across all slips (one selection can be picked per pair). */
  private groupPairs(grp: string): SelState[] {
    const out: SelState[] = [];
    for (const b of this.loader.model()?.bollette ?? []) {
      for (const g of b.groups) {
        if (g.grp === grp) out.push(...g.sels);
      }
    }
    return out;
  }

  /**
   * Set a selection's outcome, but drop the override entirely when it matches the
   * real outcome — so toggling a pair back to reality clears its customization
   * (and the group's highlight) instead of leaving a redundant override behind.
   */
  private applyOutcome(s: SelState, value: boolean): void {
    const key = selKey(s.grp, s.t1, s.t2);
    if (value === s.realQual) this.whatIf.clearSel(key);
    else this.whatIf.setSel(key, value);
  }

  protected readonly euro = euro;

  /** Per-group background by outcome code; odd groups get a darker shade. */
  protected groupBg(code: number, darker: boolean): string {
    const p = darker ? OUTCOME_DARKER : OUTCOME;
    if (code === 2) return p.pass;
    if (code === -2) return p.fail;
    if (code === -1) return p.open;
    return darker ? OUTCOME_DARKER.neutral : ''; // 1 = winning but still open -> neutral
  }

  /** Footer background: only when the slip is definitive. */
  protected footBg(code: number): string {
    if (code === 2) return OUTCOME.pass;
    if (code === -2) return OUTCOME.lost;
    return '';
  }
}
