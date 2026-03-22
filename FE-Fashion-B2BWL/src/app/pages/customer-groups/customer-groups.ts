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
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-customer-groups',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiDataList, TuiDataListWrapper, TuiBadge, TuiTextfieldControllerModule, 
    TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield
  ],
  templateUrl: './customer-groups.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerGroupsComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';
  selectedGroup: CustomerGroup | null = null;

  rowData: CustomerGroup[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  editingId: number | null = null;
  
  formData: Partial<CustomerGroup> = {
    name: '',
    defaultDiscountRate: 0
  };

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
    this.api.getCustomerGroups().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 100, pinned: 'left' },
      { 
        field: 'name', 
        headerValueGetter: () => this.transloco.translate('MEMBER.GROUP_NAME'), 
        width: 300,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
      { 
        field: 'defaultDiscountRate', 
        headerValueGetter: () => this.transloco.translate('MEMBER.DISCOUNT_RATE'), 
        width: 150,
        valueFormatter: (params: any) => params.value ? params.value + '%' : '0%'
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 200,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: CustomerGroup) => this.onView(data),
          onEdit: (data: CustomerGroup) => this.onEdit(data),
          onDelete: (data: CustomerGroup) => this.onDelete(data)
        }
      }
    ];
  }

  onView(group: CustomerGroup): void {
    this.selectedGroup = group;
    this.dialogs.open(this.viewDialogTemplate, { size: 'm', label: this.transloco.translate('MEMBER.GROUP_DETAIL') })
      .subscribe();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = { name: '', defaultDiscountRate: 0 };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onEdit(group: CustomerGroup): void {
    this.editingId = group.id;
    this.formData = { ...group };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onDelete(group: CustomerGroup): void {
    this.deleteTargetName = group.name;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteCustomerGroup(group.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const action = this.editingId 
      ? this.api.updateCustomerGroup(this.editingId, this.formData)
      : this.api.createCustomerGroup(this.formData);

    action.subscribe(() => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void { this.showForm = false; }
}
