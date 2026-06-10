import { Component, inject } from '@angular/core';
import { DataLoader } from '../../core/data-loader';
import { abbr } from '../../core/team-abbr';
import { selKey, WhatIf } from '../../core/what-if';
import { euro } from '../../core/format';
import { SelState } from '../../core/model';

const PALETTE = { green: '#d9f2e1', pink: '#fbd9e6', yellow: '#fcf1b8', red: '#f9d6d6' };
// Slightly darker variants used to tell odd groups apart from even ones.
const PALETTE_DARKER = { green: '#c7e6d3', pink: '#f6c7da', yellow: '#f7e69c', neutral: '#f4f6f9' };

@Component({
  selector: 'app-tabellone',
  imports: [],
  templateUrl: './tabellone.html',
  styleUrl: './tabellone.css',
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

  protected readonly euro = euro;

  /** Per-group background by outcome code; odd groups get a darker shade. */
  protected groupBg(code: number, darker: boolean): string {
    const p = darker ? PALETTE_DARKER : PALETTE;
    if (code === 2) return p.green;
    if (code === -2) return p.pink;
    if (code === -1) return p.yellow;
    return darker ? PALETTE_DARKER.neutral : ''; // 1 = winning but still open -> neutral
  }

  /** Footer background: only when the slip is definitive. */
  protected footBg(code: number): string {
    if (code === 2) return PALETTE.green;
    if (code === -2) return PALETTE.red;
    return '';
  }
}
