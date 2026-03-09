import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiTextfield, TuiFlagPipe, TuiDropdown, TuiOptGroup, TuiOption } from '@taiga-ui/core';
import { TuiBadge, TuiBadgedContent } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../services/language.service';

@Component({
    standalone: true,
    selector: 'app-language-switcher',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslocoModule,
        TuiBadge,
        TuiBadgedContent,
        TuiButton,
        TuiDataList,
        TuiDropdown,
        TuiFlagPipe,
        TuiOptGroup,
        TuiOption,
        TuiTextfield,
    ],
    templateUrl: './language-switcher.component.html',
    styleUrls: ['./language-switcher.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
    protected readonly switcher = inject(LanguageService);
    protected readonly language = new FormControl(this.switcher.currentLanguage);
    public openLanguageDropdown = false;

    public readonly flags = new Map<string, string>([
        ['en', 'GB'],
        ['vi', 'VN'],
    ]);

    public readonly names: string[] = ['vi', 'en'];

    constructor() {
        this.language.valueChanges.subscribe(lang => {
            if(lang) {
                this.setLang(lang);
            }
        });
        this.switcher.currentLanguage$.subscribe(lang => {
            if (this.language.value !== lang) {
                this.language.setValue(lang, { emitEvent: false });
            }
        });
    }

    public setLang(lang: string): void {
        this.language.setValue(lang, { emitEvent: false });
        this.switcher.setLanguage(lang);
        this.openLanguageDropdown = false;
    }
}
