import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'app-storefront-footer',
  standalone: true,
  imports: [CommonModule, TuiIcon],
  templateUrl: './storefront-footer.html',
  styleUrls: ['./storefront-footer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontFooterComponent {}
