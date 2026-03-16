import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, SubscriptionPlan } from '../../services/api.service';
import { TuiButton, TuiDialogService, TuiAlertService, TuiTextfield, TuiLabel, TuiIcon } from '@taiga-ui/core';
import { TuiBadge, TuiInputNumber } from '@taiga-ui/kit';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiBadge,
    TranslocoModule,
    FormsModule,
    ReactiveFormsModule,
    TuiInputNumber,
    TuiTextfield,
    TuiLabel,
    TuiIcon,
    TuiTextfieldControllerModule
  ],
  template: `
    <div class="plans-container" *transloco="let t">
      <div class="header-section" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h2 class="title">{{ 'SAAS.PLANS_TITLE' | transloco }}</h2>
        <button tuiButton size="m" type="button" (click)="openEditDialog(null)">
          {{ 'COMMON.ADD' | transloco }}
        </button>
      </div>

      <div class="grid-wrapper" style="padding: 0 16px;">
        <div class="plans-grid" *ngIf="plans.length > 0; else emptyState">
          <div *ngFor="let plan of plans" class="plan-card">
            <h2 class="plan-title">{{ plan.name }}</h2>
            <div class="price-section">
              <span class="price">{{ plan.monthlyPrice | number }}đ</span>
              <span class="period">/ {{ t('SAAS.MONTH') }}</span>
            </div>
            <div class="yearly-price">
               {{ plan.yearlyPrice | number }}đ / {{ t('SAAS.YEAR') }}
            </div>
            
            <tui-badge [appearance]="getStatusAppearance(plan.status)" class="status-badge" size="s">
              {{ plan.status }}
            </tui-badge>

            <div class="features-box">
               <pre>{{ plan.features }}</pre>
            </div>

            <div class="actions">
              <button tuiButton appearance="secondary" size="s" (click)="openEditDialog(plan)">
                {{ 'COMMON.EDIT' | transloco }}
              </button>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-container">
            <tui-icon icon="@tui.search-x" class="empty-icon"></tui-icon>
            <p>{{ 'SAAS.NO_PLANS' | transloco }}</p>
            <button tuiButton appearance="secondary" (click)="openEditDialog(null)">
              {{ 'COMMON.ADD' | transloco }}
            </button>
          </div>
        </ng-template>
      </div>

      <ng-template #editDialog let-observer>
        <div class="dialog-content">
          <h3 style="margin-bottom: 24px;">{{ (isEdit ? 'COMMON.EDIT' : 'COMMON.ADD') | transloco }}</h3>
          
          <form [formGroup]="planForm">
            <div class="tui-form__row">
              <tui-textfield>
                <input tuiTextfield formControlName="name" />
                {{ 'SAAS.PLAN_NAME' | transloco }}
              </tui-textfield>
            </div>

            <div class="tui-form__row">
              <tui-input-number formControlName="monthlyPrice">
                {{ 'SAAS.MONTHLY_PRICE' | transloco }}
              </tui-input-number>
            </div>

            <div class="tui-form__row">
              <tui-input-number formControlName="yearlyPrice">
                {{ 'SAAS.YEARLY_PRICE' | transloco }}
              </tui-input-number>
            </div>

            <div class="tui-form__row">
              <tui-textfield>
                <textarea tuiTextfield formControlName="features"></textarea>
                {{ 'SAAS.FEATURES_JSON' | transloco }}
              </tui-textfield>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
              <button tuiButton size="m" appearance="accent" [disabled]="planForm.invalid" (click)="savePlan(observer)">
                {{ 'COMMON.SAVE' | transloco }}
              </button>
              <button tuiButton size="m" appearance="secondary" (click)="observer.complete()">
                {{ 'COMMON.CANCEL' | transloco }}
              </button>
            </div>
          </form>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .plan-card { 
      position: relative; 
      padding: 1.5rem;
      padding-bottom: 4rem; 
      background: white; 
      border-radius: 12px; 
      border: 1px solid #eee; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .plan-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .plan-title { margin: 0; font-size: 1.25rem; color: #333; }
    .price-section { margin: 12px 0; }
    .price { font-size: 24px; font-weight: 800; color: #1a1a1a; }
    .period { color: #666; font-size: 14px; }
    .yearly-price { font-size: 13px; color: #888; margin-bottom: 16px; }
    .features-box { margin-top: 16px; background: #f8f9fa; padding: 12px; border-radius: 8px; font-size: 12px; border: 1px dashed #ccc; }
    .features-box pre { margin: 0; white-space: pre-wrap; font-family: monospace; }
    .actions { position: absolute; bottom: 16px; right: 16px; }
    .tui-form__row { margin-bottom: 16px; }
    .dialog-content { padding: 4px; }
    .empty-container { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      padding: 4rem; 
      background: #fcfcfc; 
      border-radius: 12px; 
      border: 2px dashed #eee;
      color: #999;
    }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlansComponent implements OnInit {
  @ViewChild('editDialog') editDialogTemplate!: TemplateRef<any>;
  plans: SubscriptionPlan[] = [];
  planForm: FormGroup;
  isEdit = false;
  selectedPlanId?: number;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private dialogs: TuiDialogService,
    private alerts: TuiAlertService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {
    this.planForm = this.fb.group({
      name: ['', Validators.required],
      monthlyPrice: [0, Validators.required],
      yearlyPrice: [0, Validators.required],
      features: ['{}', Validators.required],
      status: ['ACTIVE']
    });
  }

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.api.getPlans().subscribe(plans => {
      this.plans = plans;
      this.cdr.detectChanges();
    });
  }

  getStatusAppearance(status: string): string {
    return status === 'ACTIVE' ? 'success' : 'neutral';
  }

  openEditDialog(plan: SubscriptionPlan | null) {
    this.isEdit = !!plan;
    if (plan) {
      this.selectedPlanId = plan.id;
      this.planForm.patchValue(plan);
    } else {
      this.selectedPlanId = undefined;
      this.planForm.reset({ status: 'ACTIVE', features: '{}' });
    }
    
    this.dialogs.open(this.editDialogTemplate, {
      label: this.transloco.translate(this.isEdit ? 'COMMON.EDIT' : 'COMMON.ADD'),
      size: 'm'
    }).subscribe();
  }

  savePlan(observer: any) {
    const data = this.planForm.value;
    const obs = this.isEdit 
      ? this.api.updatePlan(this.selectedPlanId!, data)
      : this.api.createPlan(data);

    obs.subscribe(() => {
      this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
      this.loadPlans();
      observer.complete();
    });
  }
}
