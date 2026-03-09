import { Component, ChangeDetectorRef } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiButton } from '@taiga-ui/core';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-action-renderer',
  standalone: true,
  imports: [TuiButton, TranslocoModule],
  template: `
    <div style="display:flex; gap:8px; align-items:center; height:100%;">
      <button tuiButton appearance="secondary" size="s" iconStart="@tui.eye" (click)="onView()">{{ 'PRODUCT.VIEW' | transloco }}</button>
      <button tuiButton appearance="secondary" size="s" iconStart="@tui.pencil" (click)="onEdit()">{{ 'PRODUCT.EDIT' | transloco }}</button>
      <button tuiButton appearance="accent" size="s" iconStart="@tui.trash-2" (click)="onDelete()">{{ 'PRODUCT.DELETE' | transloco }}</button>
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
}
