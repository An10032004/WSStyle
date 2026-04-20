import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel, TuiDataList } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiDataListWrapper, TuiSelect, TuiMultiSelect, TuiRadio } from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, SaleCampaign, Category, Product, CustomerGroup } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { RuleConflictWarningComponent } from '../../shared/components/rule-conflict-warning/rule-conflict-warning';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiLabel, TuiSelect, TuiDataList, TuiDataListWrapper, TuiMultiSelect, TuiTextfieldControllerModule, RuleConflictWarningComponent, TuiRadio],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header page-header--toolbar">
        <h1 class="tui-text_h3 page-header__title">{{ 'SIDEBAR.CAMPAIGNS' | transloco }}</h1>
        <div class="page-actions">
          <button tuiButton type="button" size="m" appearance="primary" iconStart="@tui.plus" (click)="showAddDialog()">New Campaign</button>
        </div>
      </div>

      <ng-template #addDialog let-observer>
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 12px;">New Sale Campaign</h2>
          <app-rule-conflict-warning [conflicts]="conflicts"></app-rule-conflict-warning>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px;">
            <tui-textfield class="full-width">
              <input tuiTextfield [(ngModel)]="newCampaign.name" (ngModelChange)="checkConflicts()" placeholder="Summer Sale 2024" />
              Campaign Name
            </tui-textfield>
            
            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCampaign.discountPercentage" placeholder="20" />
              Discount (%)
            </tui-textfield>

            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCampaign.priority" (ngModelChange)="checkConflicts()" />
              Priority (0=Highest)
            </tui-textfield>

            <tui-textfield class="full-width">
              <input tuiTextfield [(ngModel)]="newCampaign.bannerUrl" placeholder="https://..." />
              Banner URL
            </tui-textfield>

            <tui-textfield class="full-width">
              <textarea tuiTextfield [(ngModel)]="newCampaign.description" placeholder="Description..."></textarea>
              Description
            </tui-textfield>

            <label tuiLabel>
              Start Date
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCampaign.startDate" />
              </tui-textfield>
            </label>

            <label tuiLabel>
                End Date
              <tui-textfield>
                <input tuiTextfield type="datetime-local" [(ngModel)]="newCampaign.endDate" />
              </tui-textfield>
            </label>
          </div>

          <h3 class="tui-text_h6 campaign-dialog__subtitle">Targeting (Who & What?)</h3>
          <div class="campaign-targeting">
            <div class="form-field full-width">
              <div class="choice-field__label">Apply To Customer Type</div>
              <div class="radio-group-modern">
                <label *ngFor="let opt of customerTypeOptions" class="modern-radio">
                  <input
                    tuiRadio
                    type="radio"
                    name="campApplyCustomerType"
                    [value]="opt"
                    [(ngModel)]="newCampaign.applyCustomerType"
                    (ngModelChange)="checkConflicts()"
                  />
                  <div class="radio-content">
                    <span class="radio-title">{{ opt }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-field full-width" *ngIf="newCampaign.applyCustomerType === 'GROUP'">
              <label tuiLabel>Select Customer Groups</label>
              <tui-multi-select [(ngModel)]="selectedGroupIds" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="customerGroups()" [itemContent]="groupContent"></tui-data-list-wrapper>
                <ng-template #groupContent let-item>{{ item.name }}</ng-template>
              </tui-multi-select>
            </div>

            <div class="form-field full-width">
              <div class="choice-field__label">Apply To Product Type</div>
              <div class="radio-group-modern">
                <label *ngFor="let opt of productApplyOptions" class="modern-radio">
                  <input
                    tuiRadio
                    type="radio"
                    name="campApplyProductType"
                    [value]="opt"
                    [(ngModel)]="newCampaign.applyProductType"
                    (ngModelChange)="checkConflicts()"
                  />
                  <div class="radio-content">
                    <span class="radio-title">{{ opt }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-field full-width" *ngIf="newCampaign.applyProductType === 'CATEGORY'">
              <label tuiLabel>Select Categories</label>
              <tui-multi-select [(ngModel)]="selectedCategoryIds" (ngModelChange)="checkConflicts()">
                <tui-data-list-wrapper *tuiDataList [items]="categories()" [itemContent]="catContent"></tui-data-list-wrapper>
                <ng-template #catContent let-item>{{ item.name }}</ng-template>
              </tui-multi-select>
            </div>
          </div>
          
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Start Campaign</button>
          </div>
        </div>
      </ng-template>
      
      <div class="campaign-grid">
        <div *ngFor="let campaign of campaigns()" class="campaign-card">
          <img [src]="campaign.bannerUrl" class="banner" />
          <div class="card-content">
            <div class="header-row">
              <h3>{{ campaign.name }}</h3>
              <div style="display: flex; gap: 8px;">
                <span style="font-size: 11px; color: #999;">Prio: {{ campaign.priority }}</span>
                <button tuiButton type="button" size="xs" appearance="flat" (click)="deleteCampaign(campaign.id)">Delete</button>
              </div>
            </div>
            <p>{{ campaign.description }}</p>
            <div class="footer">
               <span class="discount">-{{ campaign.discountPercentage }}%</span>
               <span class="status" [class.active]="campaign.isActive">
                 {{ campaign.isActive ? 'Active' : 'Ended' }}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './sale-campaigns.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleCampaignsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly customerTypeOptions = ['ALL', 'GUEST', 'LOGGED_IN', 'GROUP'] as const;
  readonly productApplyOptions = ['ALL', 'CATEGORY'] as const;
  
  readonly campaigns = signal<SaleCampaign[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly customerGroups = signal<CustomerGroup[]>([]);
  
  selectedCategoryIds: Category[] = [];
  selectedGroupIds: CustomerGroup[] = [];

  conflicts: string[] = [];

  @ViewChild('addDialog') addDialogTemplate!: TemplateRef<any>;

  newCampaign = {
    name: '',
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
    discountPercentage: 0,
    startDate: '',
    endDate: '',
    priority: 0,
    applyProductType: 'ALL',
    applyProductValue: '',
    applyCustomerType: 'ALL',
    applyCustomerValue: ''
  };

  constructor() {
    this.refresh();
    this.loadCommonData();
  }

  async loadCommonData() {
    const [cats, groups] = await Promise.all([
      firstValueFrom(this.api.getCategories()),
      firstValueFrom(this.api.getCustomerGroups())
    ]);
    this.categories.set(cats);
    this.customerGroups.set(groups);
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getSaleCampaigns());
    this.campaigns.set(data);
    this.cdr.detectChanges();
  }

  showAddDialog() {
    this.newCampaign = { 
      name: '', 
      description: '',
      bannerUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
      discountPercentage: 0,
      startDate: '',
      endDate: '',
      priority: 0,
      applyProductType: 'ALL',
      applyProductValue: '',
      applyCustomerType: 'ALL',
      applyCustomerValue: ''
    };
    this.selectedCategoryIds = [];
    this.selectedGroupIds = [];
    this.conflicts = [];

    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 'l' }).subscribe({
      next: (res) => {
        if (res) this.saveCampaign();
      }
    });
  }

  checkConflicts() {
    const target = {
      name: this.newCampaign.name || 'New Campaign',
      applyProductType: this.newCampaign.applyProductType || 'ALL',
      applyProductValue: this.newCampaign.applyProductType === 'CATEGORY' 
        ? JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) })
        : '{}',
      applyCustomerType: this.newCampaign.applyCustomerType || 'ALL',
      applyCustomerValue: this.newCampaign.applyCustomerType === 'GROUP'
        ? JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) })
        : '{}',
      priority: this.newCampaign.priority || 0
    };

    this.api.checkRuleConflicts('CAMPAIGN', target).subscribe(res => {
      this.conflicts = res;
      this.cdr.detectChanges();
    });
  }

   async saveCampaign() {
    this.checkConflicts(); // Final check
    
    let productVal = '{}';
    if (this.newCampaign.applyProductType === 'CATEGORY') {
      productVal = JSON.stringify({ categoryIds: this.selectedCategoryIds.map(c => c.id) });
    }

    let customerVal = '{}';
    if (this.newCampaign.applyCustomerType === 'GROUP') {
      customerVal = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    }

    await firstValueFrom(this.api.createSaleCampaign({
      ...this.newCampaign,
      applyProductValue: productVal,
      applyCustomerValue: customerVal,
      isActive: true,
      status: 'ACTIVE'
    }));
    this.refresh();
  }

  async deleteCampaign(id: number) {
    this.dialogs.open<boolean>(TUI_CONFIRM, {
      label: 'Delete Campaign',
      size: 's',
      data: {
        content: 'Are you sure you want to delete this campaign? This action cannot be undone.',
        yes: 'Delete',
        no: 'Cancel'
      }
    }).subscribe(async (res) => {
      if (res) {
        await firstValueFrom(this.api.deleteSaleCampaign(id));
        this.refresh();
      }
    });
  }
}
