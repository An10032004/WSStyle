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
import { ApiService, User, Role } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AgGridAngular, TuiButton, TuiInputNumber, 
    TuiSelectModule, TuiDataList, TuiDataListWrapper, TuiBadge,
    TuiTextfieldControllerModule, TuiLabel, TuiIcon, TranslocoModule, ActionRendererComponent, TuiTextfield
  ],
  templateUrl: './staff.html',
  styleUrls: ['./staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffComponent implements OnInit, OnDestroy {
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  @ViewChild('adminDeleteDialog') adminDeleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';
  selectedUser: User | null = null;

  rowData: User[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  defaultColDef: ColDef = { resizable: true, minWidth: 100 };
  
  showForm = false;
  editingId: number | null = null;
  
  formData: any = {
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'STAFF',
    assignedRole: null,
    registrationStatus: 'APPROVED',
    // customerGroup removed for staff management
  };

  // Primary account role selector remains simple (ADMIN/STAFF)
  primaryRoleOptions: string[] = ['ADMIN', 'STAFF'];

  // Assigned permission roles loaded from backend and filtered by primary role
  assignedRoleOptions: string[] = [];
  allRoles: Role[] = [];
  currentIsAdmin = false;

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
    // customer groups no longer loaded for staff management
    // Load roles and compute selectable assignedRole options based on current user's privileges
    this.api.getRoles().subscribe((roles: Role[]) => {
      this.allRoles = roles || [];

      const currentUser = this.auth.currentUserValue;
      this.currentIsAdmin = false;
      if (currentUser && currentUser.role) {
        const myRole = this.allRoles.find(r => r.name && r.name.toUpperCase() === (currentUser.role || '').toUpperCase());
        this.currentIsAdmin = !!(myRole && myRole.isAdmin) || ['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN'].includes((currentUser.role || '').toUpperCase());
      }

      // Initialize assignedRoleOptions according to current formData.role
      this.updateAssignedRoleOptions();
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
    // Fetch all users and filter those that have STAFF membership (primary or secondary)
    const adminRoles = ['ADMIN', 'Administrator', 'STAFF'];
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
            // also capture assignedRole if present in tags (separate from primary role)
            if (t && t.assignedRole) {
              (u as any).assignedRole = t.assignedRole;
            }
          } catch (e) { }
        }
        (u as any).roles = roles;
        return u;
      }).filter(u => (u as any).roles.some((r: string) => adminRoles.includes(r)));

      this.rowData = processed;
      this.cdr.detectChanges();
    });
  }

  loadCustomerGroups(): void {
    // removed: staff should not manage customer groups
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
        field: 'assignedRole',
        headerValueGetter: () => this.transloco.translate('MEMBER.ASSIGNED_ROLE'),
        width: 200,
        cellRenderer: (params: any) => {
          const v = params.value || (params.data && params.data.assignedRole) || '';
          return v ? this.transloco.translate('ENUMS.' + v) : '';
        }
      },
      { field: 'phone', headerValueGetter: () => this.transloco.translate('MEMBER.PHONE'), width: 130 },
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
  }

  onPrimaryRoleChange(newRole: string) {
    this.formData.role = newRole;
    this.updateAssignedRoleOptions();
    // reset assignedRole when primary role changes to avoid stale selection
    this.formData.assignedRole = null;
  }

  private updateAssignedRoleOptions() {
    if (!this.allRoles) { this.assignedRoleOptions = []; return; }

    const primary = (this.formData && this.formData.role) ? this.formData.role.toString().toUpperCase() : 'STAFF';
    let options: Role[] = [];

    if (primary === 'ADMIN' || primary === 'ADMINISTRATOR' || primary === 'SUPER_ADMIN') {
      options = this.allRoles.filter(r => !!r.isAdmin);
    } else {
      // staff or others -> non-admin roles
      options = this.allRoles.filter(r => !r.isAdmin);
    }

    // If current user is not admin, ensure admin roles are not selectable
    if (!this.currentIsAdmin) options = options.filter(r => !r.isAdmin);

    this.assignedRoleOptions = options.map(r => r.name);
  }

  onAdd(): void {
    this.editingId = null;
    this.formData = {
      email: '', password: '', fullName: '', phone: '', role: 'STAFF',
      assignedRole: null,
      registrationStatus: 'APPROVED'
    };
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onEdit(user: User): void {
    this.editingId = user.id;
    // read assignedRole from tags if present
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
      password: '', // Don't show password hash
      assignedRole: assignedFromTags ?? null
      // customerGroup intentionally omitted for staff
    };

    // Refresh assignedRoleOptions according to the user's primary role
    this.updateAssignedRoleOptions();
    // Ensure the user's assigned role is visible in dropdown even if it wouldn't normally be selectable
    if (assignedFromTags && !this.assignedRoleOptions.includes(assignedFromTags)) {
      this.assignedRoleOptions = [...this.assignedRoleOptions, assignedFromTags];
    }
    this.showForm = true;
    this.cdr.detectChanges();
  }

  onDelete(user: User): void {
    // Prevent deleting Admin users: show popup
    if (user.role && user.role.toUpperCase() === 'ADMIN') {
      this.dialogs.open(this.adminDeleteDialogTemplate, { size: 's' }).subscribe();
      return;
    }

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
    // Merge assignedRole into tags JSON so primary `role` is not overwritten
    const payload: any = { ...this.formData };
    // Start with existing tags if editing
    let tagsObj: any = {};
    if (this.editingId && payload.tags) {
      try { tagsObj = JSON.parse(payload.tags) || {}; } catch (e) { tagsObj = {}; }
    }
    if (payload.assignedRole) tagsObj.assignedRole = payload.assignedRole; else if (tagsObj.assignedRole) delete tagsObj.assignedRole;
    payload.tags = Object.keys(tagsObj).length ? JSON.stringify(tagsObj) : null;

    const action = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser(payload);

    action.subscribe(() => {
      const msg = this.editingId ? 'GLOBAL.UPDATE_SUCCESS' : 'GLOBAL.CREATE_SUCCESS';
      this.alerts.open(this.transloco.translate(msg), { appearance: 'success' }).subscribe();
      this.showForm = false;
      this.loadData();
    });
  }

  cancel(): void { this.showForm = false; }
}
