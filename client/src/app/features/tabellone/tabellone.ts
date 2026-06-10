import { Component, inject } from '@angular/core';
import { DataLoader } from '../../core/data-loader';
import { abbr } from '../../core/team-abbr';

const PALETTE = { green: '#d9f2e1', pink: '#fbd9e6', yellow: '#fcf1b8', red: '#f9d6d6' };

@Component({
  selector: 'app-tabellone',
  imports: [],
  templateUrl: './tabellone.html',
  styleUrl: './tabellone.css',
})
export class Tabellone {
  protected readonly loader = inject(DataLoader);
  protected readonly abbr = abbr;

  protected euro(x: number): string {
    return x.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  /** Per-group background by outcome code. */
  protected groupBg(code: number): string {
    if (code === 2) return PALETTE.green;
    if (code === -2) return PALETTE.pink;
    if (code === -1) return PALETTE.yellow;
    return ''; // 1 = winning but still open -> neutral
  }

  /** Footer background: only when the slip is definitive. */
  protected footBg(code: number): string {
    if (code === 2) return PALETTE.green;
    if (code === -2) return PALETTE.red;
    return '';
  }
}
