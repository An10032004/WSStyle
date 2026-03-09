import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef, 
  GridApi, 
  GridReadyEvent 
} from 'ag-grid-community';
import { 
  TuiButton, 
  TuiTextfield, 
  TuiLabel, 
  TuiIcon,
  TuiDataList,
  TuiAlertService,
  TuiDialogService
} from '@taiga-ui/core';
import { 
  TuiDataListWrapper, 
  TuiBadge,
  TuiInputNumber
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, PricingRule } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    TuiButton,
    TuiInputNumber,
    TuiSelectModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfieldControllerModule,
    TuiLabel,
    TuiIcon,
    TuiBadge,
    TuiTextfield,
    TranslocoModule,
    ActionRendererComponent
  ],
  templateUrl: './pricing-rules.html',
  styleUrls: ['./pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: PricingRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: PricingRule | null = null;
  
  formData: Partial<PricingRule> = {
    name: '',
    priority: 0,
    status: 'ACTIVE',
    ruleType: 'B2B_PRICE',
    applyCustomerType: 'ALL',
    applyCustomerValue: '{}',
    excludeCustomerOption: 'NONE',
    excludeCustomerValue: '{}',
    applyProductType: 'ALL',
    applyProductValue: '{}',
    excludeProductOption: 'NONE',
    excludeProductValue: '{}',
    actionConfig: '{}'
  };

  statusOptions = ['ACTIVE', 'INACTIVE'];
  ruleTypeOptions = ['B2B_PRICE', 'QUANTITY_BREAK'];
  customerTypeOptions = ['ALL', 'GROUP', 'SPECIFIC'];
  productTypeOptions = ['ALL', 'CATEGORY', 'SPECIFIC'];

  private langSub?: Subscription;

  constructor(
    private api: ApiService,
    private alerts: TuiAlertService,
    private dialogs: TuiDialogService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.updateColumnDefs();
    this.loadData();
    // Use selectTranslation to refresh grid when language changes
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  loadData(): void {
    this.api.getPricingRules().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 70 },
      { 
        field: 'name', 
        headerValueGetter: () => this.transloco.translate('RULE.NAME'), 
        flex: 1 
      },
      { 
        field: 'priority', 
        headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), 
        width: 100 
      },
      { 
        field: 'status', 
        headerValueGetter: () => this.transloco.translate('RULE.STATUS'), 
        width: 120,
        valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value)
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: PricingRule) => this.onView(data),
          onEdit: (data: PricingRule) => this.onEdit(data),
          onDelete: (data: PricingRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: PricingRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedRule = null;
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      name: '',
      priority: 0,
      status: 'ACTIVE',
      ruleType: 'B2B_PRICE',
      applyCustomerType: 'ALL',
      applyCustomerValue: '{}',
      excludeCustomerOption: 'NONE',
      excludeCustomerValue: '{}',
      applyProductType: 'ALL',
      applyProductValue: '{}',
      excludeProductOption: 'NONE',
      excludeProductValue: '{}',
      actionConfig: '{}'
    };
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(rule: PricingRule): void {
    this.editingId = rule.id;
    this.formData = { ...rule };
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onDelete(rule: PricingRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deletePricingRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const action = this.editingId 
      ? this.api.updatePricingRule(this.editingId, this.formData)
      : this.api.createPricingRule(this.formData);

    action.subscribe(() => {
      const msg = this.editingId 
        ? this.transloco.translate('GLOBAL.UPDATE_SUCCESS') 
        : this.transloco.translate('GLOBAL.CREATE_SUCCESS');
      this.alerts.open(msg, { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void {
    this.showForm = false;
  }
}
