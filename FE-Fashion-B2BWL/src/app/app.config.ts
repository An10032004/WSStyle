import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, isDevMode, Injectable } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './interceptors/auth.interceptor';
import { NG_EVENT_PLUGINS } from '@taiga-ui/event-plugins';
import { tuiIconResolverProvider } from '@taiga-ui/core';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Observable } from 'rxjs';

import { routes } from './app.routes';
import { LanguageService } from './services/language.service';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<object> {
    // Use root-relative path to avoid issues with sub-routes
    return this.http.get(`/assets/i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    NG_EVENT_PLUGINS,
    tuiIconResolverProvider((icon) => {
      const name = icon.replace(/^@[a-zA-Z]+\./, '');
      return `https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${name}.svg`;
    }),
    {
      provide: TUI_LANGUAGE,
      useFactory: () => inject(LanguageService).tuiLanguage$,
    },
    provideTransloco({
      config: {
        availableLangs: ['en', 'vi'],
        defaultLang: 'vi',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    }),
  ],
};
