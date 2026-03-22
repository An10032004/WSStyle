import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TuiRoot, RouterOutlet, TranslocoModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'Fashion B2BWL';

  constructor(transloco: TranslocoService) {
    transloco.setActiveLang('vi');
  }
}
