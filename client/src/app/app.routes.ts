import { Routes } from '@angular/router';

import { Tabellone } from './features/tabellone/tabellone';
import { Gironi } from './features/gironi/gironi';
import { Risultati } from './features/risultati/risultati';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Tabellone, title: 'Dashboard' },
  { path: 'groups', component: Gironi, title: 'Gruppi' },
  { path: 'matches', component: Risultati, title: 'Incontri' },
  { path: '**', redirectTo: 'dashboard' },
];
