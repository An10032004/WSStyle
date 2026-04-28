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
  TuiAlertService,
  TuiDialogService
} from '@taiga-ui/core';
import { 
  TuiInputNumber,
  TuiBadge,
  TuiCheckbox
} from '@taiga-ui/kit';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, NetTermRule, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-net-term-rules',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield,
    TuiBadge, TuiCheckbox
  ],
  templateUrl: './net-term-rules.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetTermRulesComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  rowData: NetTermRule[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};

  showForm = false;
  showDetails = false;
  editingId: number | null = null;
  selectedRule: NetTermRule | null = null;

  formData: Partial<NetTermRule> = {
    name: '', priority: 0, status: 'ACTIVE', applyCustomerType: 'GROUP', applyCustomerValue: '{}', conditionType: 'OVER_MONTHLY_SPEND', netTermDays: 30
  };

  statusOptions = ['ACTIVE', 'INACTIVE'];
  customerTypeOptions = ['GROUP'];

  customerGroups: any[] = [];
  selectedGroupIds: any[] = [];

  stringifyGroup = (item: any) => item?.name || '';

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
    this.langSub = this.transloco.selectTranslation().subscribe(() => {
      this.localeText = this.languageService.currentLanguage === 'vi' ? AG_GRID_LOCALE_VI : {};
      if (this.gridApi) {
        this.gridApi.refreshHeader();
        this.gridApi.refreshCells();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void { this.langSub?.unsubscribe(); }

  loadData(): void {
    this.api.getNetTermRules().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
    this.api.getCustomerGroups().subscribe(data => {
      this.customerGroups = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'name', headerValueGetter: () => this.transloco.translate('RULE.NAME'), flex: 1 },
      { field: 'netTermDays', headerValueGetter: () => this.transloco.translate('RULE.NET_TERM_DAYS'), width: 120 },
      { field: 'priority', headerValueGetter: () => this.transloco.translate('RULE.PRIORITY'), width: 100 },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: NetTermRule) => this.onView(data),
          onEdit: (data: NetTermRule) => this.onEdit(data),
          onDelete: (data: NetTermRule) => this.onDelete(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onView(rule: NetTermRule): void {
    this.selectedRule = rule;
    this.showDetails = true;
    this.showForm = false;
    this.cdr.detectChanges();
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedRule = null;
    this.cdr.detectChanges();
  }

  getCustomerGroupNames(rule: NetTermRule): string {
    if (rule.applyCustomerType !== 'GROUP' || !rule.applyCustomerValue) return '';
    try {
      const val = JSON.parse(rule.applyCustomerValue);
      const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
      const names = this.customerGroups.filter(g => ids.includes(g.id)).map(g => g.name);
      return names.length ? names.join(', ') : `(IDs: ${ids.join(', ')})`;
    } catch { return rule.applyCustomerValue || ''; }
  }

  syncTargeting() {
    if (this.formData.applyCustomerType === 'GROUP') {
      this.formData.applyCustomerValue = JSON.stringify({ groupIds: this.selectedGroupIds.map(g => g.id) });
    } else {
      this.formData.applyCustomerValue = '{}';
    }
  }

  parseTargeting() {
    if (this.formData.applyCustomerType === 'GROUP' && this.formData.applyCustomerValue) {
      try {
        const val = JSON.parse(this.formData.applyCustomerValue);
        const ids = val.groupIds || (val.groupId ? [val.groupId] : []);
        this.selectedGroupIds = this.customerGroups.filter(g => ids.includes(g.id));
      } catch (e) { this.selectedGroupIds = []; }
    } else {
      this.selectedGroupIds = [];
    }
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = { name: '', priority: 0, status: 'ACTIVE', applyCustomerType: 'GROUP', applyCustomerValue: '{}', conditionType: 'OVER_MONTHLY_SPEND', netTermDays: 30 };
    this.selectedGroupIds = [];
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onEdit(data: NetTermRule): void {
    this.editingId = data.id;
    this.formData = { ...data, applyCustomerType: 'GROUP' };
    this.parseTargeting();
    this.showForm = true;
    this.showDetails = false;
    this.cdr.detectChanges();
  }

  onDelete(rule: NetTermRule): void {
    this.deleteTargetName = rule.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteNetTermRule(rule.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    this.syncTargeting();

    const validationError = this.validateNetTermForm();
    if (validationError) {
      this.alerts.open(validationError, { appearance: 'error' }).subscribe();
      this.cdr.detectChanges();
      return;
    }

    // Priority duplicate: chỉ báo khi bấm Lưu.
    const priority = Number(this.formData.priority || 0);
    const duplicate = this.rowData.find(r => r.priority === priority && r.id !== this.editingId);
    if (duplicate) {
      this.alerts.open(`Mức độ ưu tiên đã tồn tại (đang dùng bởi "${duplicate.name}").`, {
        appearance: 'error',
      }).subscribe();
      this.cdr.detectChanges();
      return;
    }

    const action = this.editingId ? this.api.updateNetTermRule(this.editingId, this.formData) : this.api.createNetTermRule(this.formData);
    action.subscribe(() => { 
      const msg = this.editingId 
        ? this.transloco.translate('GLOBAL.UPDATE_SUCCESS') 
        : this.transloco.translate('GLOBAL.CREATE_SUCCESS');
      this.alerts.open(msg, { appearance: 'success' }).subscribe();
      this.showForm = false; 
      this.loadData(); 
    });
  }

  cancel(): void { this.showForm = false; }

  private validateNetTermForm(): string | null {
    const name = String(this.formData.name || '').trim();
    if (!name) return 'Vui lòng nhập tên quy tắc.';
    this.formData.name = name;

    const priority = Number(this.formData.priority);
    if (!Number.isFinite(priority) || priority < 0) {
      return 'Vui lòng nhập mức độ ưu tiên hợp lệ (>= 0).';
    }
    this.formData.priority = priority;

    const days = Number(this.formData.netTermDays);
    if (!Number.isFinite(days) || days <= 0) {
      return 'Số ngày công nợ phải lớn hơn 0.';
    }
    if (days > 365) {
      return 'Số ngày công nợ không hợp lệ (tối đa 365 ngày).';
    }
    this.formData.netTermDays = days;

    return null;
  }

  isNetTermGroupSelected(g: any): boolean {
    return this.selectedGroupIds.some(x => x.id === g.id);
  }

  toggleNetTermGroup(g: any, checked: boolean): void {
    if (checked) {
      if (!this.isNetTermGroupSelected(g)) {
        this.selectedGroupIds = [...this.selectedGroupIds, g];
      }
    } else {
      this.selectedGroupIds = this.selectedGroupIds.filter(x => x.id !== g.id);
    }
    this.syncTargeting();
    this.cdr.markForCheck();
  }
}
