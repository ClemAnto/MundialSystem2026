import { Routes } from '@angular/router';

import { Tabellone } from './features/tabellone/tabellone';
import { Gironi } from './features/gironi/gironi';
import { Risultati } from './features/risultati/risultati';

export const routes: Routes = [
  { path: '', redirectTo: 'tabellone', pathMatch: 'full' },
  { path: 'tabellone', component: Tabellone, title: 'Tabellone' },
  { path: 'gironi', component: Gironi, title: 'Gironi' },
  { path: 'risultati', component: Risultati, title: 'Risultati' },
  { path: '**', redirectTo: 'tabellone' },
];
