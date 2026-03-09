import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TuiNavigation } from '@taiga-ui/layout';
import { TuiIcon, TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageSwitcherComponent } from './header/language-switcher.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TuiNavigation,
    TranslocoModule,
    TuiIcon,
    TuiButton,
    TuiAvatar,
    LanguageSwitcherComponent
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  sidebarExpanded = true;
}
