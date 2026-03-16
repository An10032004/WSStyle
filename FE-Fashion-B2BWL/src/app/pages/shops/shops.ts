import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Shop, SubscriptionPlan } from '../../services/api.service';
import { TuiButton, TuiDialogService, TuiAlertService, TuiTextfield, TuiLabel, TuiDataList } from '@taiga-ui/core';
import { TuiBadge, TuiDataListWrapper } from '@taiga-ui/kit';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AgGridAngular } from 'ag-grid-angular';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef, 
  GridApi, 
  GridReadyEvent 
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiBadge,
    TranslocoModule,
    AgGridAngular,
    FormsModule,
    ReactiveFormsModule,
    TuiTextfield,
    TuiLabel,
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfieldControllerModule
  ],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="header-section" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h2 class="title">{{ 'SAAS.SHOPS_TITLE' | transloco }}</h2>
        <button tuiButton size="m" type="button" (click)="openEditDialog(null)">
          {{ 'COMMON.ADD' | transloco }}
        </button>
      </div>

      <div class="grid-wrapper">
        <ag-grid-angular
          style="width: 100%; height: 600px;"
          class="ag-theme-alpine"
          [rowData]="shops"
          [columnDefs]="columnDefs"
          [pagination]="true"
          [paginationPageSize]="20"
          (gridReady)="onGridReady($event)"
        ></ag-grid-angular>
      </div>

      <ng-template #editDialog let-observer>
        <div class="dialog-content">
          <h3 style="margin-bottom: 24px;">{{ (isEdit ? 'COMMON.EDIT' : 'COMMON.ADD') | transloco }}</h3>
          
          <form [formGroup]="shopForm">
            <div class="tui-form__row">
              <tui-textfield>
                <input tuiTextfield formControlName="shopName" />
                {{ 'SAAS.SHOP_NAME' | transloco }}
              </tui-textfield>
            </div>

            <div class="tui-form__row">
              <tui-textfield>
                <input tuiTextfield formControlName="domain" />
                Domain (e.g. mystore.com)
              </tui-textfield>
            </div>

            <div class="tui-form__row">
              <tui-textfield>
                <input tuiTextfield formControlName="ownerEmail" />
                {{ 'SAAS.OWNER_EMAIL' | transloco }}
              </tui-textfield>
            </div>

            <div class="tui-form__row">
              <tui-select formControlName="planId">
                {{ 'SAAS.PLAN' | transloco }}
                <tui-data-list-wrapper
                  *tuiDataList
                  [items]="plans"
                  [itemContent]="planContent"
                ></tui-data-list-wrapper>
              </tui-select>
              <ng-template #planContent let-plan>
                {{ plan.name }}
              </ng-template>
            </div>

            <div class="tui-form__row">
              <tui-select formControlName="status">
                {{ 'SAAS.STATUS' | transloco }}
                <tui-data-list-wrapper
                  *tuiDataList
                  [items]="statusOptions"
                ></tui-data-list-wrapper>
              </tui-select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px;">
              <button tuiButton size="m" appearance="accent" [disabled]="shopForm.invalid" (click)="saveShop(observer)">
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
    .page-container { padding: 0; }
    .grid-wrapper { padding: 0 16px; }
    .tui-form__row { margin-bottom: 16px; }
    .dialog-content { padding: 4px; }
  `],
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopsComponent implements OnInit {
  @ViewChild('editDialog') editDialogTemplate!: TemplateRef<any>;
  shops: Shop[] = [];
  plans: SubscriptionPlan[] = [];
  shopForm: FormGroup;
  isEdit = false;
  selectedShopId?: number;
  statusOptions = ['ACTIVE', 'TRIAL', 'EXPIRED'];

  gridApi!: GridApi;
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'domain', headerName: 'Domain', flex: 1 },
    { field: 'shopName', headerValueGetter: () => 'Shop Name', flex: 1 },
    { field: 'ownerEmail', headerValueGetter: () => 'Owner Email', flex: 1 },
    { 
      headerName: 'Plan',
      valueGetter: params => params.data.plan?.name || 'N/A',
      flex: 1
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellRenderer: (params: any) => {
        const appearance = params.value === 'ACTIVE' ? 'success' : params.value === 'TRIAL' ? 'info' : 'neutral';
        return `<span class="tui-badge tui-badge_${appearance}">${params.value}</span>`;
      }
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.innerText = 'Edit';
        btn.onclick = () => this.openEditDialog(params.data);
        return btn;
      }
    }
  ];

  constructor(
    private api: ApiService, 
    private fb: FormBuilder,
    private dialogs: TuiDialogService,
    private alerts: TuiAlertService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {
    this.shopForm = this.fb.group({
      shopName: ['', Validators.required],
      domain: ['', Validators.required],
      ownerEmail: ['', [Validators.required, Validators.email]],
      planId: [null, Validators.required],
      status: ['ACTIVE', Validators.required]
    });
  }

  ngOnInit() {
    this.loadShops();
    this.loadPlans();
  }

  loadShops() {
    this.api.getShops().subscribe(shops => {
      this.shops = shops;
      this.cdr.detectChanges();
    });
  }

  loadPlans() {
    this.api.getPlans().subscribe(plans => {
      this.plans = plans;
      this.cdr.detectChanges();
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  openEditDialog(shop: Shop | null) {
    this.isEdit = !!shop;
    if (shop) {
      this.selectedShopId = shop.id;
      this.shopForm.patchValue({
        shopName: shop.shopName,
        domain: shop.domain,
        ownerEmail: shop.ownerEmail,
        planId: shop.plan?.id,
        status: shop.status
      });
    } else {
      this.selectedShopId = undefined;
      this.shopForm.reset({ status: 'ACTIVE' });
    }

    this.dialogs.open(this.editDialogTemplate, {
      label: this.transloco.translate(this.isEdit ? 'COMMON.EDIT' : 'COMMON.ADD'),
      size: 'm'
    }).subscribe();
  }

  saveShop(observer: any) {
    if (this.shopForm.invalid) return;
    
    const formVal = this.shopForm.value;
    const selectedPlan = this.plans.find(p => p.id === formVal.planId);
    
    const shopData: Partial<Shop> = {
      shopName: formVal.shopName,
      domain: formVal.domain,
      ownerEmail: formVal.ownerEmail,
      plan: selectedPlan,
      status: formVal.status
    };

    const obs = this.isEdit 
      ? this.api.updateShop(this.selectedShopId!, shopData)
      : this.api.createShop(shopData);

    obs.subscribe(() => {
      this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
      this.loadShops();
      observer.complete();
    });
  }
}
