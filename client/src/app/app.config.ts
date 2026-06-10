import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import it from '@angular/common/locales/it';
import { it_IT, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import {
  TableOutline,
  OrderedListOutline,
  ReloadOutline,
  EditOutline,
  ClockCircleOutline,
  ExclamationCircleFill,
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';

registerLocaleData(it);

// ng-zorro icons are tree-shakable: every icon used in a template must be registered here.
const icons = [TableOutline, OrderedListOutline, ReloadOutline, EditOutline, ClockCircleOutline, ExclamationCircleFill];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(it_IT),
    provideNzIcons(icons),
    // ng-zorro follows the active theme: read --primary (themes/*.scss) and let
    // NzConfigService derive the whole ant palette (requires the "variable"
    // build of the ng-zorro CSS, see angular.json).
    provideAppInitializer(() => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (primary) inject(NzConfigService).set('theme', { primaryColor: primary });
    }),
  ],
};
