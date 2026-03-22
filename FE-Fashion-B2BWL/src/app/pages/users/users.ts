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
import { ApiService, User, CustomerGroup } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield
  ],
  templateUrl: './users.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';
  selectedUser: User | null = null;

  rowData: User[] = [];
  customerGroups: CustomerGroup[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  editingId: number | null = null;
  
  formData: any = {
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'RETAIL',
    customerGroupId: null,
    registrationStatus: 'APPROVED',
    companyName: '',
    taxCode: ''
  };

  roleOptions = ['RETAIL', 'WHOLESALE', 'GUEST'];
  statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];

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
    this.api.getCustomerGroups().subscribe(groups => {
      this.customerGroups = groups;
      this.cdr.detectChanges();
    });

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
    this.api.getUsers().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 100, pinned: 'left' },
      { field: 'email', headerValueGetter: () => this.transloco.translate('MEMBER.EMAIL'), width: 250 },
      { 
        field: 'fullName', 
        headerValueGetter: () => this.transloco.translate('MEMBER.NAME'), 
        width: 250,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
      { 
        field: 'role', 
        headerValueGetter: () => this.transloco.translate('MEMBER.ROLE'), 
        width: 120,
        valueFormatter: (params: any) => this.transloco.translate('ENUMS.' + params.value)
      },
      { 
        field: 'customerGroup.name', 
        headerValueGetter: () => this.transloco.translate('MEMBER.GROUP'), 
        width: 150 
      },
      { 
        field: 'registrationStatus', 
        headerValueGetter: () => this.transloco.translate('MEMBER.STATUS'), 
        width: 120,
        cellRenderer: (params: any) => {
          const status = params.value;
          const color = status === 'APPROVED' ? 'success' : (status === 'PENDING' ? 'warning' : 'danger');
          return `<span class="tui-badge tui-badge_${color}">${status}</span>`;
        }
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 200,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: User) => this.onView(data),
          onEdit: (data: User) => this.onEdit(data),
          onDelete: (data: User) => this.onDelete(data)
        }
      }
    ];
  }

  onView(user: User): void {
    this.selectedUser = user;
    this.dialogs.open(this.viewDialogTemplate, { size: 'm', label: this.transloco.translate('MEMBER.USER_DETAIL') })
      .subscribe();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      email: '', password: '', fullName: '', phone: '', role: 'RETAIL',
      customerGroupId: null, registrationStatus: 'APPROVED', companyName: '', taxCode: ''
    };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onEdit(user: User): void {
    this.editingId = user.id;
    this.formData = { 
      ...user, 
      customerGroupId: user.customerGroup?.id || null,
      password: '' // Don't show password hash
    };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onDelete(user: User): void {
    this.deleteTargetName = user.fullName || user.email;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteUser(user.id).subscribe(() => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSubmit(): void {
    const action = this.editingId 
      ? this.api.updateUser(this.editingId, this.formData)
      : this.api.createUser(this.formData);

    action.subscribe(() => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void { this.showForm = false; }

  getGroupName(id: number | null): string {
    const g = this.customerGroups.find(x => x.id === id);
    return g ? g.name : 'None';
  }
}
