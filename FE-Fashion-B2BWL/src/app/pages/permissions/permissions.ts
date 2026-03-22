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
        <h1 class="tui-text_h3">{{ 'SIDEBAR.PERMISSIONS' | transloco }}</h1>
        <button tuiButton type="button" size="m" (click)="showAddRoleDialog()">Create Role</button>
      </div>

      <ng-template #addRoleDialog let-observer>
        <div class="dialog-content">
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
        <div class="dialog-content">
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
          <p class="tui-text_body-s" style="margin-bottom: 16px; color: #666;">Toggle permissions to grant or revoke access.</p>
          
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
        <div *ngFor="let role of roles()" class="role-card">
          <div class="role-header">
             <h3>{{ role.name }}</h3>
             <tui-badge [appearance]="role.isAdmin ? 'primary' : 'neutral'" size="s">
               {{ role.isAdmin ? 'Full Access' : 'Limited' }}
             </tui-badge>
          </div>
          <p class="desc">{{ role.description }}</p>
          <div class="perms">
             <span *ngFor="let p of role.permissions" class="perm-tag">{{ p }}</span>
          </div>
          <div class="role-actions">
             <button tuiButton type="button" size="s" appearance="secondary" (click)="showEditPermissionsDialog(role)">Edit Permissions</button>
             <button tuiButton type="button" size="s" appearance="secondary-destructive" (click)="deleteRole(role)">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .roles-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .role-card { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #eee; display: flex; flex-direction: column; }
    .role-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .desc { color: #666; font-size: 14px; margin-bottom: 20px; flex: 1; }
    .perms { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .perm-tag { background: #f5f5f5; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #444; }
    .role-actions { border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; }
    .permissions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 400px; overflow-y: auto; padding: 4px; }
    .perm-item { display: flex; align-items: center; }
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
