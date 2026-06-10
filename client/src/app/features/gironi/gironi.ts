import { Component, inject, viewChild } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DataLoader } from '../../core/data-loader';
import { WhatIf } from '../../core/what-if';
import { obbligoRowBg } from '../../core/colors';
import { GironeView } from '../../core/model';
import { SintesiBollette } from '../sintesi-bollette/sintesi-bollette';

@Component({
  selector: 'app-gironi',
  imports: [CdkDropList, CdkDrag, SintesiBollette],
  templateUrl: './gironi.html',
  styleUrl: './gironi.css',
})
export class Gironi {
  protected readonly loader = inject(DataLoader);
  protected readonly whatIf = inject(WhatIf);
  protected readonly rowBg = obbligoRowBg;
  /** Summary card instance: exposes the hovered group to highlight its card. */
  protected readonly sintesi = viewChild.required(SintesiBollette);

  /** What-if drag: record the new ranking of the group, the model recomputes. */
  protected onDrop(g: GironeView, event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;
    const order = g.rows.map((r) => r.team);
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.whatIf.setGroupOrder(g.letter, order);
  }
}
