import { Component, ChangeDetectionStrategy, signal, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel } from '@taiga-ui/core';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { TUI_CONFIRM, TuiBadge, TuiCheckbox } from '@taiga-ui/kit';
import { ApiService, Role } from '../../services/api.service';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiBadge, TuiTextfield, TuiLabel, TuiCheckbox, TuiTextfieldControllerModule, RichTextEditorComponent],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <div class="header-content">
          <h1 class="tui-text_h3 luxe-title">{{ 'SIDEBAR.PERMISSIONS' | transloco }}</h1>
          <p class="tui-text_body-s subtitle">Define roles and manage granular access permissions for your team.</p>
        </div>
        <div class="page-actions">
          <button tuiButton type="button" size="m" shape="rounded" class="luxe-create-btn" (click)="showAddRoleDialog()">
            <tui-icon icon="@tui.plus" class="tui-space_right-2"></tui-icon>
            Create New Role
          </button>
        </div>
      </div>

      <!-- ... Dialog Templates stay mostly same logic, maybe subtle CSS updates later ... -->
      <ng-template #addRoleDialog let-observer>
        <div class="dialog-content luxe-glass">
          <h2 class="tui-text_h5 dialog-title">Create New Role</h2>
          <div class="dialog-form">
            <label tuiLabel class="dialog-field dialog-field--full">
              Role Name
              <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                <input tuiTextfield [(ngModel)]="newRoleName" placeholder="Editor" />
              </tui-textfield>
            </label>
            <label tuiLabel class="dialog-field dialog-field--full">
              Description
              <app-rich-text-editor [(ngModel)]="newRoleDescription"></app-rich-text-editor>
            </label>
            <label tuiLabel class="dialog-choice dialog-field--full">
              <input tuiCheckbox type="checkbox" [(ngModel)]="newRoleIsAdmin" />
              <div class="dialog-choice__text">
                <div class="dialog-choice__title">Is Admin (Super User)</div>
                <div class="dialog-choice__hint">Gives full access to all modules and settings.</div>
              </div>
            </label>
          </div>
          <div class="dialog-actions">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Create Role</button>
          </div>
        </div>
      </ng-template>

      <ng-template #editPermissionsDialog let-observer>
        <div class="dialog-content luxe-glass">
          <h2 class="tui-text_h5 dialog-title">Edit Role: {{ editingRoleOriginalName }}</h2>
          <div class="dialog-form dialog-form--spaced">
            <label tuiLabel class="dialog-field dialog-field--full">
              Role Name
              <tui-textfield tuiTextfieldSize="l" [tuiTextfieldCleaner]="true">
                <input tuiTextfield [(ngModel)]="editingRoleName" placeholder="Role Name" />
              </tui-textfield>
            </label>
            <label tuiLabel class="dialog-field dialog-field--full">
              Description
              <app-rich-text-editor [(ngModel)]="editingRoleDescription"></app-rich-text-editor>
            </label>
            <label tuiLabel class="dialog-choice dialog-field--full">
              <input tuiCheckbox type="checkbox" [(ngModel)]="editingRoleIsAdmin" />
              <div class="dialog-choice__text">
                <div class="dialog-choice__title">Is Admin (Super User)</div>
                <div class="dialog-choice__hint">System roles are protected from deletion.</div>
              </div>
            </label>
          </div>
          <h3 class="tui-text_h6 dialog-subtitle">Permissions</h3>
          <div class="permissions-grid">
            <div *ngFor="let p of allPermissions" class="perm-item">
              <label tuiLabel class="perm-check">
                <input tuiCheckbox type="checkbox" [(ngModel)]="selectedPermissions[p]" />
                <span class="perm-check__name">{{ p }}</span>
              </label>
            </div>
          </div>
          <div class="dialog-actions">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Save Changes</button>
          </div>
        </div>
      </ng-template>
      
      <div class="roles-list">
        <div *ngFor="let role of roles()" class="role-card luxe-glass-card" [class.admin-card]="role.isAdmin">
          <div class="card-gradient-top"></div>
          <div class="role-card-inner">
            <div class="role-header">
               <div class="title-group">
                 <h3 class="role-name">{{ role.name }}</h3>
                 <p class="role-id">ID: #{{ role.id }}</p>
               </div>
               <tui-badge [appearance]="role.isAdmin ? 'primary' : 'neutral'" size="s" class="status-badge">
                 {{ role.isAdmin ? 'Super User' : 'Standard' }}
               </tui-badge>
            </div>
            <p class="desc">{{ role.description }}</p>
            
            <div class="perms-section">
              <h4 class="section-title">Module Access</h4>
              <div class="perms-container">
                 <span *ngFor="let p of role.permissions.slice(0, 8)" class="perm-tag">
                   <span class="dot"></span>{{ p }}
                 </span>
                 <span class="more-tag" *ngIf="role.permissions.length > 8">+{{ role.permissions.length - 8 }} more</span>
                 <span class="no-perms" *ngIf="role.permissions.length === 0">No permissions assigned</span>
              </div>
            </div>

            <div class="role-actions">
               <button tuiButton type="button" size="s" appearance="flat" 
                 [disabled]="role.isAdmin || role.name === 'Administrator'"
                 (click)="showEditPermissionsDialog(role)">
                 <tui-icon [icon]="(role.isAdmin || role.name === 'Administrator') ? '@tui.lock' : '@tui.settings'"></tui-icon> 
                 {{ (role.isAdmin || role.name === 'Administrator') ? 'System Role' : 'Configure' }}
               </button>
               <button tuiButton type="button" size="s" appearance="flat-destructive"
                 *ngIf="!role.isAdmin && role.name !== 'Administrator'"
                 (click)="deleteRole(role)">
                 <tui-icon icon="@tui.trash"></tui-icon>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './permissions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsComponent {
  private readonly dialogs = inject(TuiDialogService);
  private readonly api = inject(ApiService);
  
  readonly roles = signal<any[]>([]);

  constructor() {
    this.loadRoles();
  }

  loadRoles() {
    this.api.getRoles().subscribe(data => {
      // Map JSON string permissions back to arrays for display
      const mapped = data.map(r => ({
        ...r,
        permissions: this.safeParse(r.permissionsJson)
      }));
      this.roles.set(mapped);
    });
  }

  private safeParse(json: string | null): string[] {
    if (!json) return [];
    try {
      return JSON.parse(json) || [];
    } catch (e) {
      return [];
    }
  }

  @ViewChild('addRoleDialog') addRoleDialogTemplate!: TemplateRef<any>;
  @ViewChild('editPermissionsDialog') editPermissionsDialogTemplate!: TemplateRef<any>;
  
  newRoleName = '';
  newRoleDescription = '';
  newRoleIsAdmin = false;
  editingRoleOriginalName = '';
  editingRoleName = '';
  editingRoleDescription = '';
  editingRoleIsAdmin = false;
  selectedPermissions: Record<string, boolean> = {};

  readonly allPermissions = [
    'Quản lý nhân viên', 'Quản lý report', 'Quản lý coupon', 'Quản lý ví điện tử',
    'Quản lý chiến dịch sale', 'Quản lý hồ sơ đại lý', 'Quản lý sản phẩm',
    'Quản lý danh mục', 'Quản lý đơn hàng', 'Quản lý nhóm khách hàng',
    'Quản lý ẩn giá', 'Quản lý AI', 'Quản lý banner', 'Quản lý chiết khấu',
    'Quản lý người dùng', 'Quản lý biến thể', 'Quản lý giới hạn đặt hàng',
    'Quản lý phí vận chuyển', 'Hỗ trợ khách hàng', 'Point of sale',
    'Quản lý công nợ', 'Quản lý giá thuê'
  ];

  showAddRoleDialog() {
    this.newRoleName = '';
    this.newRoleDescription = '';
    this.newRoleIsAdmin = false;
    this.dialogs.open<boolean>(this.addRoleDialogTemplate, { size: 's' }).subscribe({
      next: (res) => {
        if (res && this.newRoleName) this.addRole();
      }
    });
  }

  showEditPermissionsDialog(role: any) {
    this.editingRoleOriginalName = role.name;
    this.editingRoleName = role.name;
    this.editingRoleDescription = role.description;
    this.editingRoleIsAdmin = !!role.isAdmin;
    this.selectedPermissions = {};
    this.allPermissions.forEach(p => {
      this.selectedPermissions[p] = role.permissions.includes(p);
    });

    this.dialogs.open<boolean>(this.editPermissionsDialogTemplate, { size: 'm' }).subscribe({
      next: (res) => {
        if (res) this.savePermissions();
      }
    });
  }

  addRole() {
    const newRole: Role = {
       name: this.newRoleName,
       isAdmin: !!this.newRoleIsAdmin,
       description: this.newRoleDescription || 'New role created by admin',
       permissionsJson: '[]'
    };
    this.api.saveRole(newRole).subscribe(() => this.loadRoles());
  }

  savePermissions() {
    const newPerms = this.allPermissions.filter(p => this.selectedPermissions[p]);
    const targetRole = this.roles().find(r => r.name === this.editingRoleOriginalName);
    if (!targetRole) return;

    const updatedRole: Role = {
      ...targetRole,
      name: this.editingRoleName,
      description: this.editingRoleDescription,
      permissionsJson: JSON.stringify(newPerms),
      isAdmin: !!this.editingRoleIsAdmin
    };

    this.api.saveRole(updatedRole).subscribe(() => this.loadRoles());
  }

  deleteRole(role: Role) {
    this.dialogs.open<boolean>(TUI_CONFIRM, {
      label: 'Delete Role',
      size: 's',
      data: {
        content: `Are you sure you want to delete the "${role.name}" role?`,
        yes: 'Delete',
        no: 'Cancel'
      }
    }).subscribe(res => {
      if (res && role.id) {
        this.api.deleteRole(role.id).subscribe(() => this.loadRoles());
      }
    });
  }
}
