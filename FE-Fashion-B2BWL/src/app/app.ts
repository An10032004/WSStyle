import { Component } from '@angular/core';
import { TuiRoot } from '@taiga-ui/core';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';
import { LayoutComponent } from './layout/layout';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TuiRoot, LayoutComponent, TranslocoModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'Fashion B2BWL';

  constructor(transloco: TranslocoService) {
    transloco.setActiveLang('vi');
  }
}
