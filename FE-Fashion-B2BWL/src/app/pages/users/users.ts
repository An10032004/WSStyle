import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import { adminRegistrationStatusPillClass, escapeHtml } from '../../utils/admin-status-pills';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge,
    TuiTextfieldControllerModule, TuiLabel, TranslocoModule, ActionRendererComponent, TuiTextfield
  ],
  templateUrl: './users.html',
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  @ViewChild('deleteErrorDialog') deleteErrorDialogTemplate!: TemplateRef<any>;
  @ViewChild('duplicateEmailDialog') duplicateEmailDialogTemplate!: TemplateRef<any>;
  @ViewChild('adminDeleteDialog') adminDeleteDialogTemplate!: TemplateRef<any>;
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
    fullName: '',
    phone: '',
    role: 'RETAIL',
    customerGroupId: null,
    registrationStatus: 'APPROVED',
    companyName: '',
    taxCode: ''
  };

  formErrors: Record<string, string> = {};
  deleteErrorMessage: string | null = null;
  duplicateEmailMessage: string | null = null;

  roleOptions = ['RETAIL', 'WHOLESALE', 'GUEST'];
  statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];

  get selectedGroupName(): string {
    if (!this.customerGroups || !this.formData.customerGroupId) return 'None';
    const group = this.customerGroups.find(g => g.id === this.formData.customerGroupId);
    return group ? group.name : 'None';
  }

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
    // Fetch all users and compute composite roles (primary + secondary)
    const customerRoles = ['RETAIL', 'WHOLESALE', 'GUEST', 'CUSTOMER'];
    this.api.getUsers().subscribe(data => {
      const processed = data.map(u => {
        const roles: string[] = [];
        if (u.role) roles.push(u.role);
        if (u.tags) {
          try {
            const t = JSON.parse(u.tags);
            const arr = t?.secondaryRoles ?? t?.roles;
            if (Array.isArray(arr)) {
              for (const r of arr) {
                if (typeof r === 'string' && r && !roles.includes(r)) roles.push(r);
              }
            }
          } catch (e) { /* ignore tags parse errors */ }
        }
        (u as any).roles = roles;
        return u;
      }).filter(u => (u as any).roles.some((r: string) => customerRoles.includes(r)));

      this.rowData = processed;
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
        width: 180,
        cellRenderer: (params: any) => {
          const roles: string[] = params.data?.roles ?? (params.value ? [params.value] : []);
          return roles.map((r: string, i: number) => {
            const cls = i === 0 ? 'tui-badge_primary' : 'tui-badge_outline';
            return `<span class="tui-badge ${cls}" style="margin-right:6px">${this.transloco.translate('ENUMS.' + r)}</span>`;
          }).join(' ');
        }
      },
      { 
        field: 'customerGroup.name', 
        headerValueGetter: () => this.transloco.translate('MEMBER.GROUP'), 
        width: 150 
      },
      {
        field: 'companyName',
        headerValueGetter: () => this.transloco.translate('MEMBER.COMPANY'),
        width: 180,
      },
      {
        field: 'taxCode',
        headerValueGetter: () => this.transloco.translate('MEMBER.TAX_CODE'),
        width: 130,
      },
      {
        colId: 'shippingDisplay',
        headerValueGetter: () => this.transloco.translate('MEMBER.SHIPPING_DISPLAY'),
        flex: 1,
        minWidth: 220,
        maxWidth: 380,
        valueGetter: (p) => UsersComponent.userShippingSummary(p.data as User),
        tooltipValueGetter: (p) => UsersComponent.userShippingSummary(p.data as User),
      },
      { 
        field: 'registrationStatus', 
        headerValueGetter: () => this.transloco.translate('MEMBER.STATUS'), 
        width: 120,
        cellRenderer: (params: any) => {
          const status = params.value;
          const label = this.registrationStatusLabel(status);
          return `<span class="${adminRegistrationStatusPillClass(status)}">${escapeHtml(label)}</span>`;
        }
      },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 260,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: User) => this.onView(data),
          onEdit: (data: User) => this.onEdit(data),
          onDelete: (data: User) => this.onDelete(data)
        },
        pinned: 'right',
        suppressSizeToFit: true
      }
    ];
  }

  clearFormErrors(): void {
    this.formErrors = {};
  }

  private handleApiError(err: any): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400 && err.error && err.error.data) {
        this.formErrors = err.error.data;
        this.alerts.open('Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường.', { appearance: 'warning' }).subscribe();
        return;
      }
      if (err.status === 409 && err.error && err.error.message) {
        const msg = String(err.error.message).toLowerCase();
        if (msg.includes('email')) {
          this.duplicateEmailMessage = 'Email này đã được đăng ký. Vui lòng sử dụng email khác.';
          this.dialogs.open(this.duplicateEmailDialogTemplate, { size: 'm' }).subscribe();
          return;
        }
        this.deleteErrorMessage = err.error.message;
        this.dialogs.open(this.deleteErrorDialogTemplate, { size: 'm' }).subscribe();
        return;
      }
    }
    const message = err?.error?.message || err?.message || 'Lỗi hệ thống';
    this.alerts.open(message, { appearance: 'error' }).subscribe();
  }

  onView(user: User): void {
    // Ensure roles/display string available for the detail view
    if (!(user as any).roles) {
      const roles: string[] = [];
      if (user.role) roles.push(user.role);
      if (user.tags) {
        try {
          const t = JSON.parse(user.tags);
          const arr = t?.secondaryRoles ?? t?.roles;
          if (Array.isArray(arr)) {
            for (const r of arr) if (typeof r === 'string' && r && !roles.includes(r)) roles.push(r);
          }
        } catch (e) { }
      }
      (user as any).roles = roles;
    }
    (user as any).displayRoles = (user as any).roles.map((r: string) => this.transloco.translate('ENUMS.' + r)).join(' / ');
    this.selectedUser = user;
    this.dialogs.open(this.viewDialogTemplate, { size: 'm', label: this.transloco.translate('MEMBER.USER_DETAIL') })
      .subscribe();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => {
      this.gridApi.autoSizeAllColumns();
    }, 100);
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
    // Prevent deleting Admin: show explanatory popup
    if (user.role && user.role.toUpperCase() === 'ADMIN') {
      this.dialogs.open(this.adminDeleteDialogTemplate, { size: 's' }).subscribe();
      return;
    }

    this.deleteTargetName = user.fullName || user.email;
    this.dialogs.open<boolean>(this.deleteDialogTemplate, { size: 'm' })
      .subscribe(response => {
        if (response) {
          this.api.deleteUser(user.id).subscribe({ next: () => {
            this.alerts.open(this.transloco.translate('GLOBAL.RECORD_DELETED'), { appearance: 'success' }).subscribe();
            this.loadData();
          }, error: (err) => this.handleApiError(err) });
        }
      });
  }

  onSubmit(): void {
    // Prevent Users page from assigning permission roles when creating a new user,
    // but preserve existing assignedRole when editing other fields (e.g., customer group).
    const payload: any = { ...this.formData };
    if (!this.editingId) {
      // Creating: strip any assignedRole from tags to forbid assignment via Users page
      if (payload.tags) {
        try {
          const t = JSON.parse(payload.tags as string) || {};
          if (t.assignedRole) delete t.assignedRole;
          payload.tags = Object.keys(t).length ? JSON.stringify(t) : null;
        } catch (e) {
          payload.tags = null;
        }
      }
    } else {
      // Editing existing user: ensure tags is preserved (don't remove assignedRole)
      // If tags missing for any reason, try to keep the original tags from rowData
      if (payload.tags === undefined || payload.tags === null) {
        const original = this.rowData.find(r => r.id === this.editingId);
        if (original) payload.tags = (original as any).tags ?? null;
      }
    }

    const action = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser(payload);
    this.clearFormErrors();
    // Client-side required checks for new user
    if (!this.editingId) {
      const missing: string[] = [];
      if (!this.formData.fullName || !String(this.formData.fullName).trim()) {
        this.formErrors['fullName'] = 'Họ tên không được để trống';
        missing.push('Họ tên');
      }
      if (!this.formData.phone || !String(this.formData.phone).trim()) {
        this.formErrors['phone'] = 'Số điện thoại không được để trống';
        missing.push('Số điện thoại');
      }
      if (missing.length) {
        this.alerts.open(`Vui lòng nhập: ${missing.join(', ')}`, { appearance: 'warning' }).subscribe();
        return;
      }
    }

    action.subscribe({ next: () => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    }, error: (err) => this.handleApiError(err) });
  }

  cancel(): void { this.showForm = false; }

  getGroupName(id: number | null): string {
    const g = this.customerGroups.find(x => x.id === id);
    return g ? g.name : 'None';
  }

  registrationStatusLabel(code: string | null | undefined): string {
    const c = (code || '').toUpperCase();
    if (!c) return '';
    const key = `REGISTRATION_STATUS.${c}`;
    const t = this.transloco.translate(key);
    return t !== key ? t : String(code);
  }

  /** Một dòng địa chỉ / tỉnh cho lưới admin (parse JSON hồ sơ). */
  static userShippingSummary(u: User | undefined): string {
    const raw = u?.shippingAddressJson;
    if (!raw || !String(raw).trim()) return '—';
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      const full = o['fullLine'];
      if (typeof full === 'string' && full.trim()) return full.trim();
      const detail = typeof o['addressDetail'] === 'string' ? o['addressDetail'].trim() : '';
      const ward = typeof o['wardName'] === 'string' ? o['wardName'].trim() : '';
      const dist = typeof o['districtName'] === 'string' ? o['districtName'].trim() : '';
      const prov = typeof o['provinceName'] === 'string' ? o['provinceName'].trim() : '';
      const parts = [detail, ward, dist, prov].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    } catch {
      return '—';
    }
  }
}
