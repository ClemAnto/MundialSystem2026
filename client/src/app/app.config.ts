import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import it from '@angular/common/locales/it';
import { it_IT, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  TrophyOutline,
  TableOutline,
  OrderedListOutline,
  ReloadOutline,
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';

registerLocaleData(it);

// ng-zorro icons are tree-shakable: every icon used in a template must be registered here.
const icons = [TrophyOutline, TableOutline, OrderedListOutline, ReloadOutline];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(it_IT),
    provideNzIcons(icons),
  ],
};
