import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiButton } from '@taiga-ui/core';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-action-renderer',
  standalone: true,
  imports: [CommonModule, TuiButton, TranslocoModule],
  template: `
    <div style="display:flex; gap:8px; align-items:center; height:100%; flex-wrap:wrap;">
      <button *ngIf="params?.onView" tuiButton appearance="secondary" size="s" (click)="onView()">{{ 'PRODUCT.VIEW' | transloco }}</button>
      <button *ngIf="params?.onApproveDealer && isPendingRegistration()" tuiButton appearance="primary" size="s" (click)="onApproveDealer()">
        {{ 'MEMBER.APPROVE_DEALER' | transloco }}
      </button>
      <button *ngIf="params?.onEdit" tuiButton appearance="secondary" size="s" (click)="onEdit()">{{ 'PRODUCT.EDIT' | transloco }}</button>
      <button *ngIf="params?.onReject" tuiButton appearance="accent" size="s" (click)="onReject()">{{ 'COMMON.REJECT' | transloco }}</button>
      <button *ngIf="params?.onDelete" tuiButton appearance="accent" size="s" (click)="onDelete()">{{ 'PRODUCT.DELETE' | transloco }}</button>
    </div>
  `,
  styles: [`
    button { font-weight: 500; font-size: 13px; }
  `]
})
export class ActionRendererComponent implements ICellRendererAngularComp {
  params: any;

  constructor(private cdr: ChangeDetectorRef) {}

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.cdr.detectChanges();
    return true; 
  }

  onView() {
    if (this.params.onView) this.params.onView(this.params.data);
  }

  onEdit() {
    if (this.params.onEdit) this.params.onEdit(this.params.data);
  }

  onDelete() {
    if (this.params.onDelete) this.params.onDelete(this.params.data);
  }

  onReject() {
    if (this.params.onReject) this.params.onReject(this.params.data);
  }

  isPendingRegistration(): boolean {
    const s = this.params?.data?.registrationStatus;
    return typeof s === 'string' && s.toUpperCase() === 'PENDING';
  }

  onApproveDealer() {
    if (this.params?.onApproveDealer) this.params.onApproveDealer(this.params.data);
  }
}
