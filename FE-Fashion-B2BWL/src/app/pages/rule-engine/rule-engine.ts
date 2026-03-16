import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiTabs } from '@taiga-ui/kit';
import { PricingRulesComponent } from '../pricing-rules/pricing-rules';
import { OrderLimitsComponent } from '../order-limits/order-limits';
import { ShippingRulesComponent } from '../shipping-rules/shipping-rules';
import { NetTermRulesComponent } from '../net-term-rules/net-term-rules';
import { TaxDisplayRulesComponent } from '../tax-display-rules/tax-display-rules';
import { HidePriceRulesComponent } from '../hide-price-rules/hide-price-rules';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-rule-engine',
  standalone: true,
  imports: [
    CommonModule,
    TuiTabs,
    PricingRulesComponent,
    OrderLimitsComponent,
    ShippingRulesComponent,
    NetTermRulesComponent,
    TaxDisplayRulesComponent,
    HidePriceRulesComponent,
    TranslocoModule
  ],
  template: `
    <div class="page-container">
      <div class="tabs-container">
        <nav tuiTabs [(activeItemIndex)]="activeTab">
          <button tuiTab>
            {{ 'RULE.PRICING' | transloco }}
          </button>
          <button tuiTab>
            {{ 'RULE.ORDER_LIMITS' | transloco }}
          </button>
          <button tuiTab>
            {{ 'RULE.SHIPPING' | transloco }}
          </button>
          <button tuiTab>
            {{ 'RULE.NET_TERMS' | transloco }}
          </button>
          <button tuiTab>
            {{ 'RULE.TAX_DISPLAY' | transloco }}
          </button>
          <button tuiTab>
            {{ 'RULE.HIDE_PRICE' | transloco }}
          </button>
        </nav>
      </div>

      <div class="tab-content">
        <app-pricing-rules *ngIf="activeTab === 0"></app-pricing-rules>
        <app-order-limits *ngIf="activeTab === 1"></app-order-limits>
        <app-shipping-rules *ngIf="activeTab === 2"></app-shipping-rules>
        <app-net-term-rules *ngIf="activeTab === 3"></app-net-term-rules>
        <app-tax-display-rules *ngIf="activeTab === 4"></app-tax-display-rules>
        <app-hide-price-rules *ngIf="activeTab === 5"></app-hide-price-rules>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #fdfdfd;
    }
    .tabs-container {
      background: #fff;
      padding: 0 16px;
      border-bottom: 1px solid #eee;
    }
    .tab-content {
      flex: 1;
      overflow: auto;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleEngineComponent {
  activeTab = 0;
}
