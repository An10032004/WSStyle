import { Component, ChangeDetectionStrategy, signal, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiBadge, TuiCheckbox } from '@taiga-ui/kit';
import { ApiService, Role } from '../../services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiBadge, TuiTextfield, TuiLabel, TuiCheckbox],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <div class="header-content">
          <h1 class="tui-text_h3 luxe-title">{{ 'SIDEBAR.PERMISSIONS' | transloco }}</h1>
          <p class="tui-text_body-s subtitle">Define roles and manage granular access permissions for your team.</p>
        </div>
        <button tuiButton type="button" size="m" shape="rounded" class="luxe-create-btn" (click)="showAddRoleDialog()">
          <tui-icon icon="@tui.plus" class="tui-space_right-2"></tui-icon>
          Create New Role
        </button>
      </div>

      <!-- ... Dialog Templates stay mostly same logic, maybe subtle CSS updates later ... -->
      <ng-template #addRoleDialog let-observer>
        <div class="dialog-content luxe-glass">
          <h2 class="tui-text_h5" style="margin-bottom: 24px;">Create New Role</h2>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="newRoleName" placeholder="Editor" />
              Role Name
            </tui-textfield>
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="newRoleDescription" placeholder="Description of the role..." />
              Description
            </tui-textfield>
          </div>
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Create Role</button>
          </div>
        </div>
      </ng-template>

      <ng-template #editPermissionsDialog let-observer>
        <div class="dialog-content luxe-glass">
          <h2 class="tui-text_h5" style="margin-bottom: 24px;">Edit Role: {{ editingRoleOriginalName }}</h2>
          <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="editingRoleName" placeholder="Role Name" />
              Role Name
            </tui-textfield>
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="editingRoleDescription" placeholder="Role Description" />
              Description
            </tui-textfield>
          </div>
          <h3 class="tui-text_h6" style="margin-bottom: 12px;">Permissions</h3>
          <div class="permissions-grid">
            <div *ngFor="let p of allPermissions" class="perm-item">
              <label tuiLabel style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input tuiCheckbox type="checkbox" [(ngModel)]="selectedPermissions[p]" />
                {{ p }}
              </label>
            </div>
          </div>
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
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
  styles: [`
    .page-container {
      padding: 40px;
      background: #fcfcfd;
      min-height: 100vh;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 48px;
    }
    .luxe-title {
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 15px;
    }
    .luxe-create-btn {
      --tui-primary: #1a1a1a;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s;
    }
    .luxe-create-btn:hover {
      transform: translateY(-2px);
    }

    .roles-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 32px;
    }

    .luxe-glass-card {
      position: relative;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 10px 15px -3px rgba(0, 0, 0, 0.03);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }

    .luxe-glass-card:hover {
      transform: translateY(-8px);
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.08),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: rgba(99, 102, 241, 0.3);
    }

    .card-gradient-top {
      height: 6px;
      width: 100%;
      background: linear-gradient(90deg, #0ea5e9, #2563eb);
    }
    .admin-card .card-gradient-top {
      background: linear-gradient(90deg, #6366f1, #a855f7);
    }

    .role-card-inner {
      padding: 32px;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .role-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .role-id {
      font-size: 12px;
      color: #94a3b8;
      font-family: monospace;
    }

    .desc {
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
      flex: 1;
    }

    .perms-section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .perms-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .perm-tag {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      color: #334155;
      font-weight: 500;
    }
    .perm-tag .dot {
      width: 6px;
      height: 6px;
      background: #2563eb;
      border-radius: 50%;
      margin-right: 8px;
    }
    .admin-card .perm-tag .dot {
      background: #a855f7;
    }

    .more-tag {
      font-size: 12px;
      color: #6366f1;
      font-weight: 600;
      align-self: center;
      margin-left: 4px;
    }
    .no-perms {
      font-style: italic;
      color: #94a3b8;
      font-size: 13px;
    }

    .role-actions {
      border-top: 1px solid #f1f5f9;
      padding-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      max-height: 400px;
      overflow-y: auto;
      padding: 12px;
      background: #f8fafc;
      border-radius: 16px;
    }
  `],
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
  editingRoleOriginalName = '';
  editingRoleName = '';
  editingRoleDescription = '';
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
       isAdmin: false,
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
      permissionsJson: JSON.stringify(newPerms)
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
