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
  TuiDialogService,
  TuiLoader,
  TuiIcon
} from '@taiga-ui/core';
import { 
  TuiDataListWrapper, 
  TuiBadge,
  TuiInputNumber,
  TuiRadio
} from '@taiga-ui/kit';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, User, CustomerGroup, Role, AICustomerInsightResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { adminRegistrationStatusPillClass, escapeHtml } from '../../utils/admin-status-pills';

ModuleRegistry.registerModules([AllCommunityModule]);

/** Đồng bộ backend {@code UserService.REGISTER_EMAIL_FORMAT} */
const ADMIN_EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
/** Form /staff + tài khoản nội bộ tại trang này */
const STAFF_EMAIL_FORMAT = ADMIN_EMAIL_FORMAT;
/** Đồng bộ backend {@code UserService.VIETNAM_PHONE_10} / đăng ký storefront */
const ADMIN_PHONE_VN = /^0[0-9]{9}$/;
const STAFF_PHONE_VN = ADMIN_PHONE_VN;

/** Vai trò chính nội bộ — đồng bộ {@code UserService.isAllowedInternalPrimaryRole} */
const INTERNAL_PRIMARY_UPPER = new Set(['ADMIN', 'STAFF', 'ADMINISTRATOR', 'SUPER_ADMIN']);

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge,
    TuiTextfieldControllerModule, TuiLabel, TranslocoModule, ActionRendererComponent, TuiTextfield, TuiRadio,
    TuiLoader, TuiIcon
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
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
  aiInsight: AICustomerInsightResponse | null = null;
  loadingAi = false;

  rowData: User[] = [];
  /** Tài khoản quản trị / nhân viên (lọc theo vai trò chính nội bộ). */
  staffAdminRowData: User[] = [];
  customerGroups: CustomerGroup[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  
  showForm = false;
  editingId: number | null = null;
  /** Sửa tài khoản admin/staff từ bảng nội bộ: validate & payload giống /staff. */
  isEditingInternalAccount = false;
  allRoles: Role[] = [];
  assignedRoleOptions: string[] = [];
  currentIsAdmin = false;
  
  formData: any = {
    fullName: '',
    phone: '',
    role: 'RETAIL',
    customerGroupId: null,
    registrationStatus: 'APPROVED',
    companyName: '',
    taxCode: '',
    assignedRole: null as string | null
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

  /** Vai trò hiển thị khi sửa tài khoản nội bộ (vai trò chính + phụ, ví dụ STAFF + WHOLESALE). */
  get internalFormRoles(): string[] {
    if (!this.isEditingInternalAccount) return [];
    const raw = (this.formData as any)?.roles;
    if (Array.isArray(raw) && raw.length) return raw;
    return this.formData?.role ? [String(this.formData.role)] : [];
  }

  /** Khách sỉ như vai trò phụ hoặc chính — hiển thị / gửi nhóm chỉ định. */
  isInternalWholesaleForm(): boolean {
    if (!this.isEditingInternalAccount) return false;
    return this.internalFormRoles.some((r) => String(r).toUpperCase() === 'WHOLESALE');
  }

  /** Chọn nhóm khách: lưới khách khi WHOLESALE; form nội bộ khi có WHOLESALE trong vai trò. */
  showCustomerGroupSelector(): boolean {
    if (this.isEditingInternalAccount) return this.isInternalWholesaleForm();
    return this.isWholesaleCustomerRole();
  }

  /** Gợi ý “chỉ wholesale mới chọn nhóm” — chỉ cho luồng khách (không nội bộ). */
  showRetailCustomerGroupHint(): boolean {
    return !this.isEditingInternalAccount && !this.isWholesaleCustomerRole();
  }

  private langSub?: Subscription;

  constructor(
    private api: ApiService, 
    private alerts: TuiAlertService,
    private dialogs: TuiDialogService,
    private cdr: ChangeDetectorRef, 
    private transloco: TranslocoService, 
    private languageService: LanguageService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.updateColumnDefs();
    this.loadData();
    this.api.getRoles().subscribe((roles: Role[]) => {
      this.allRoles = roles || [];
      const currentUser = this.auth.currentUserValue;
      this.currentIsAdmin = false;
      if (currentUser && currentUser.role) {
        const myRole = this.allRoles.find(
          (r) => r.name && r.name.toUpperCase() === (currentUser.role || '').toUpperCase(),
        );
        this.currentIsAdmin =
          !!(myRole && myRole.isAdmin) ||
          ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes((currentUser.role || '').toUpperCase());
      }
      this.updateAssignedRoleOptions();
      if (this.isEditingInternalAccount && this.formData?.assignedRole) {
        const ar = String(this.formData.assignedRole);
        if (!this.assignedRoleOptions.includes(ar)) {
          this.assignedRoleOptions = [...this.assignedRoleOptions, ar];
        }
      }
      this.cdr.markForCheck();
    });
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
    const customerRoles = ['RETAIL', 'WHOLESALE', 'GUEST', 'CUSTOMER'];
    this.api.getUsers().subscribe(data => {
      const processed = data.map((u) => {
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
            if (t && t.assignedRole) {
              (u as any).assignedRole = t.assignedRole;
            }
          } catch (e) { /* ignore */ }
        }
        (u as any).roles = roles;
        return u;
      });

      this.staffAdminRowData = processed.filter((u) => this.isInternalPrimaryUser(u));
      this.rowData = processed.filter(
        (u) =>
          !this.isInternalPrimaryUser(u) &&
          (u as any).roles.some((r: string) => customerRoles.includes(r)),
      );
      this.cdr.markForCheck();
    });
  }

  /** Đồng bộ backend: vai trò chính nội bộ (admin / staff / super-user). */
  isInternalPrimaryUser(u: User | null | undefined): boolean {
    const p = (u?.role || '').trim();
    if (!p) return false;
    return INTERNAL_PRIMARY_UPPER.has(p.toUpperCase());
  }

  private updateAssignedRoleOptions(): void {
    if (!this.allRoles?.length) {
      this.assignedRoleOptions = [];
      return;
    }
    const primary = (this.formData && this.formData.role)
      ? String(this.formData.role).toUpperCase()
      : 'STAFF';
    let options: Role[] = [];
    if (primary === 'ADMIN' || primary === 'ADMINISTRATOR' || primary === 'SUPER_ADMIN') {
      options = this.allRoles.filter((r) => !!r.isAdmin);
    } else {
      options = this.allRoles.filter((r) => !r.isAdmin);
    }
    if (!this.currentIsAdmin) {
      options = options.filter((r) => !r.isAdmin);
    }
    this.assignedRoleOptions = options.map((r) => r.name);
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
            const chip = i === 0 ? 'role-chip role-chip--primary' : 'role-chip role-chip--secondary';
            return `<span class="${chip}">${this.transloco.translate('ENUMS.' + r)}</span>`;
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
        width: 360,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: User) => this.onView(data),
          onApproveDealer: (data: User) => this.approveDealerApplication(data),
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
    this.aiInsight = null;
    this.dialogs.open(this.viewDialogTemplate, { size: 'm', label: this.transloco.translate('MEMBER.USER_DETAIL') })
      .subscribe();
  }

  fetchAiInsight(): void {
    if (!this.selectedUser) return;
    this.loadingAi = true;
    this.aiInsight = null;
    this.api.getCustomerInsight(this.selectedUser.id).subscribe({
      next: (res) => {
        this.aiInsight = res;
        this.loadingAi = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadingAi = false;
        this.handleApiError(err);
        this.cdr.markForCheck();
      }
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => {
      this.gridApi.autoSizeAllColumns();
    }, 100);
  }

  onAdd(): void {
    this.editingId = null;
    this.isEditingInternalAccount = false;
    this.formData = {
      email: '', password: '', fullName: '', phone: '', role: 'RETAIL',
      customerGroupId: null, registrationStatus: 'APPROVED', companyName: '', taxCode: '',
      assignedRole: null
    };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  /**
   * Duyệt hồ sơ đại lý: PENDING → APPROVED, backend gắn WHOLESALE (khách sỉ).
   * Lấy user mới nhất từ API rồi gửi đủ trường để không xóa tags / hồ sơ.
   */
  approveDealerApplication(user: User): void {
    const st = (user.registrationStatus || '').toUpperCase();
    if (st !== 'PENDING') {
      this.alerts.open('Chỉ duyệt khi trạng thái đăng ký là Chờ duyệt (PENDING).', { appearance: 'warning' }).subscribe();
      return;
    }
    if (
      !confirm(
        `Duyệt đại lý cho ${user.email}?\nSau khi duyệt, tài khoản sẽ chuyển sang khách sỉ (giá sỉ) theo cấu hình shop.`,
      )
    ) {
      return;
    }
    this.api.getUserById(user.id).subscribe({
      next: (fresh) => {
        const body: Record<string, unknown> = {
          email: fresh.email,
          fullName: fresh.fullName,
          phone: fresh.phone,
          role: fresh.role,
          customerGroupId: fresh.customerGroup?.id ?? null,
          tags: fresh.tags ?? null,
          registrationStatus: 'APPROVED',
          companyName: fresh.companyName,
          taxCode: fresh.taxCode,
        };
        this.api.updateUser(user.id, body).subscribe({
          next: () => {
            this.alerts
              .open('Đã duyệt đại lý. Tài khoản đã là khách sỉ.', { appearance: 'success' })
              .subscribe();
            this.loadData();
            this.cdr.markForCheck();
          },
          error: (err) => this.handleApiError(err),
        });
      },
      error: (err) => this.handleApiError(err),
    });
  }

  onEdit(user: User): void {
    this.editingId = user.id;
    this.isEditingInternalAccount = this.isInternalPrimaryUser(user);

    let assignedFromTags: string | null = null;
    if (user.tags) {
      try {
        const t = JSON.parse(user.tags);
        assignedFromTags = t?.assignedRole ?? null;
      } catch (e) {
        assignedFromTags = null;
      }
    }

    this.formData = {
      ...user,
      customerGroupId: user.customerGroup?.id || null,
      password: '',
      assignedRole: this.isEditingInternalAccount ? (assignedFromTags ?? null) : null,
    };
    const effRoles: string[] = Array.isArray((user as any).roles)
      ? [...(user as any).roles]
      : user.role
        ? [user.role]
        : [];
    const hasWholesale = effRoles.some((r) => String(r).toUpperCase() === 'WHOLESALE');
    if (!hasWholesale) {
      this.formData.customerGroupId = null;
    }

    if (this.isEditingInternalAccount) {
      this.updateAssignedRoleOptions();
      if (assignedFromTags && !this.assignedRoleOptions.includes(assignedFromTags)) {
        this.assignedRoleOptions = [...this.assignedRoleOptions, assignedFromTags];
      }
    }

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

  private findUserInLists(id: number): User | undefined {
    return this.rowData.find((r) => r.id === id) ?? this.staffAdminRowData.find((r) => r.id === id);
  }

  private buildInternalStaffFormErrors(): Record<string, string> {
    const err: Record<string, string> = {};
    const em = (this.formData.email && String(this.formData.email).trim()) || '';
    if (!em) {
      err['email'] = 'Email không được để trống.';
    } else if (!STAFF_EMAIL_FORMAT.test(em)) {
      err['email'] = 'Định dạng email chưa đúng.';
    }
    const pwd = this.formData.password != null ? String(this.formData.password) : '';
    if (pwd.length > 0 && pwd.length < 6) {
      err['password'] = 'Mật khẩu mới tối thiểu 6 ký tự hoặc để trống.';
    }
    const fn = (this.formData.fullName && String(this.formData.fullName).trim()) || '';
    if (!fn) {
      err['fullName'] = 'Họ và tên không được để trống.';
    }
    const ph = (this.formData.phone && String(this.formData.phone).trim()) || '';
    if (!ph) {
      err['phone'] = 'SĐT không được để trống.';
    } else if (!STAFF_PHONE_VN.test(ph)) {
      err['phone'] = 'SĐT phải có 10 chữ số và bắt đầu bằng số 0.';
    }
    const ar = this.formData.assignedRole;
    if (ar == null || ar === '' || (typeof ar === 'string' && !ar.trim())) {
      err['assignedRole'] = 'Phải chọn quyền hệ thống (gán quyền) cho tài khoản nội bộ.';
    }
    return err;
  }

  onSubmit(): void {
    if (this.isEditingInternalAccount && this.editingId) {
      this.clearFormErrors();
      const validation = this.buildInternalStaffFormErrors();
      if (Object.keys(validation).length) {
        this.formErrors = validation;
        this.alerts.open('Vui lòng kiểm tra các trường trên form (tài khoản nội bộ).', { appearance: 'warning' }).subscribe();
        this.cdr.markForCheck();
        return;
      }
      const payload: any = { ...this.formData };
      payload.staffModule = true;
      payload.phone = (this.formData.phone && String(this.formData.phone).trim()) || '';
      if (this.isInternalWholesaleForm()) {
        payload.customerGroupId = this.formData.customerGroupId ?? null;
      } else {
        payload.customerGroupId = null;
      }

      let tagsObj: any = {};
      if (payload.tags) {
        try { tagsObj = JSON.parse(payload.tags) || {}; } catch (e) { tagsObj = {}; }
      }
      if (payload.assignedRole) {
        tagsObj.assignedRole = payload.assignedRole;
      } else if (tagsObj.assignedRole) {
        delete tagsObj.assignedRole;
      }
      payload.tags = Object.keys(tagsObj).length ? JSON.stringify(tagsObj) : null;
      if (payload.password === '' || payload.password == null) {
        delete payload.password;
      }

      this.api.updateUser(this.editingId, payload).subscribe({
        next: () => {
          this.alerts.open(this.transloco.translate('GLOBAL.UPDATE_SUCCESS'), { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.isEditingInternalAccount = false;
          this.loadData();
        },
        error: (err) => this.handleApiError(err),
      });
      return;
    }

    // Prevent Users page from assigning permission roles when creating a new user,
    // but preserve existing assignedRole when editing other fields (e.g., customer group).
    const payload: any = { ...this.formData };
    if (payload.role !== 'WHOLESALE') {
      payload.customerGroupId = null;
    }
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
        const original = this.editingId != null ? this.findUserInLists(this.editingId) : undefined;
        if (original) payload.tags = (original as any).tags ?? null;
      }
    }

    this.clearFormErrors();
    const missing: string[] = [];

    // Thêm mới: email + họ tên (+ SĐT dưới đây chung thêm/sửa)
    if (!this.editingId) {
      const em = (this.formData.email && String(this.formData.email).trim()) || '';
      if (!em) {
        this.formErrors['email'] = 'Email không được để trống.';
        missing.push('Email');
      } else if (!ADMIN_EMAIL_FORMAT.test(em)) {
        this.formErrors['email'] = 'Định dạng email chưa đúng.';
        missing.push('Email');
      }
      if (!this.formData.fullName || !String(this.formData.fullName).trim()) {
        this.formErrors['fullName'] = 'Họ tên không được để trống';
        missing.push('Họ tên');
      }
    }

    // Thêm + sửa: SĐT VN 10 số bắt đầu 0 (đồng bộ backend)
    const ph = (this.formData.phone && String(this.formData.phone).trim()) || '';
    if (!ph) {
      this.formErrors['phone'] = 'SĐT không được để trống.';
      missing.push('Số điện thoại');
    } else if (!ADMIN_PHONE_VN.test(ph)) {
      this.formErrors['phone'] = 'SĐT phải có 10 chữ số và bắt đầu bằng số 0.';
      missing.push('Số điện thoại');
    }

    if (missing.length) {
      this.alerts.open(`Vui lòng kiểm tra: ${missing.join(', ')}`, { appearance: 'warning' }).subscribe();
      this.cdr.markForCheck();
      return;
    }

    payload.phone = ph;

    const action = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser(payload);

    action.subscribe({ next: () => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    }, error: (err) => this.handleApiError(err) });
  }

  cancel(): void {
    this.showForm = false;
    this.isEditingInternalAccount = false;
  }

  trackByUserId(_index: number, u: User): number {
    return u.id;
  }

  isWholesaleCustomerRole(): boolean {
    return this.formData?.role === 'WHOLESALE';
  }

  onCustomerRoleChange(): void {
    if (this.formData.role !== 'WHOLESALE') {
      this.formData.customerGroupId = null;
    }
    this.cdr.markForCheck();
  }

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

  /** Cùng style pill như cột trạng thái trên lưới khách. */
  dealerStatusPillClass(status: string | null | undefined): string {
    return adminRegistrationStatusPillClass(status);
  }

  /** Hiển thị nút duyệt hồ sơ đại lý (PENDING) — áp dụng cho nhân viên đăng ký khách sỉ nhưng chỉ nằm ở bảng nội bộ. */
  showApproveDealer(user: User): boolean {
    return (user.registrationStatus || '').toUpperCase() === 'PENDING';
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
