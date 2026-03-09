import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TUI_ENGLISH_LANGUAGE, TUI_VIETNAMESE_LANGUAGE } from '@taiga-ui/i18n';
import type { TuiLanguage } from '@taiga-ui/i18n';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  // Application business logic language string
  private currentLanguageSubject = new BehaviorSubject<string>('vi');
  public currentLanguage$: Observable<string> = this.currentLanguageSubject.asObservable();

  // Taiga UI global translation observable
  private tuiLanguageSubject = new BehaviorSubject<TuiLanguage>(TUI_VIETNAMESE_LANGUAGE);
  public tuiLanguage$: Observable<TuiLanguage> = this.tuiLanguageSubject.asObservable();

  constructor(private translocoService: TranslocoService) {
    this.translocoService.setActiveLang('vi');
  }

  setLanguage(lang: string): void {
    if (lang === 'vi') {
      this.currentLanguageSubject.next('vi');
      this.tuiLanguageSubject.next(TUI_VIETNAMESE_LANGUAGE);
      this.translocoService.setActiveLang('vi');
    } else if (lang === 'en') {
      this.currentLanguageSubject.next('en');
      this.tuiLanguageSubject.next(TUI_ENGLISH_LANGUAGE);
      this.translocoService.setActiveLang('en');
    }
  }

  get currentLanguage(): string {
    return this.currentLanguageSubject.value;
  }
}
