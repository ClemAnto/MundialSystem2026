import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DataLoader } from './core/data-loader';

const REFRESH_MS = 60_000; // re-read data.json every minute (static read, no API limits)

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NzMenuModule, NzIconModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly loader = inject(DataLoader);

  constructor() {
    this.loader.load();
    setInterval(() => this.loader.load(), REFRESH_MS);
  }
}
