import { Component, inject } from '@angular/core';
import { DataLoader } from '../../core/data-loader';
import { abbr } from '../../core/team-abbr';
import { selKey, WhatIf } from '../../core/what-if';
import { euro } from '../../core/format';
import { SelState } from '../../core/model';
import { OUTCOME, OUTCOME_DARKER } from '../../core/colors';

@Component({
  selector: 'app-tabellone',
  imports: [],
  templateUrl: './tabellone.html',
  styleUrl: '../../styles/components/tabellone.css',
})
export class Tabellone {
  protected readonly loader = inject(DataLoader);
  protected readonly whatIf = inject(WhatIf);
  protected readonly abbr = abbr;

  /** Edit mode only: flip the check of the clicked selection and recompute. */
  protected onRowClick(n: number, s: SelState): void {
    if (!this.whatIf.editMode()) return;
    this.whatIf.toggleSel(selKey(n, s.grp, s.t1, s.t2), s.bothQual);
  }

  protected isOverridden(n: number, s: SelState): boolean {
    return selKey(n, s.grp, s.t1, s.t2) in this.whatIf.activeOverrides();
  }

  /** Restore the real outcome of one selection (without toggling it). */
  protected resetSel(event: MouseEvent, n: number, s: SelState): void {
    event.stopPropagation();
    this.whatIf.clearSel(selKey(n, s.grp, s.t1, s.t2));
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
