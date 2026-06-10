import { Component, inject } from '@angular/core';
import { DataLoader } from '../../core/data-loader';

const PALETTE = { green: '#d9f2e1', pink: '#fbd9e6' };

@Component({
  selector: 'app-gironi',
  imports: [],
  templateUrl: './gironi.html',
  styleUrl: './gironi.css',
})
export class Gironi {
  protected readonly loader = inject(DataLoader);

  /** Row background: green = obligation respected, pink = unfavourable. */
  protected rowBg(obbligo: number, pos: number): string {
    if (obbligo === 1) return pos <= 2 ? PALETTE.green : PALETTE.pink; // must pass
    if (obbligo === -1) return pos <= 2 ? PALETTE.pink : PALETTE.green; // must not pass
    return '';
  }
}
