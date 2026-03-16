import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  AllCommunityModule, 
  ModuleRegistry, 
  ColDef, 
  GridApi, 
  GridReadyEvent 
} from 'ag-grid-community';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApiService, B2BRegistrationForm } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-registration-forms',
  standalone: true,
  imports: [CommonModule, AgGridAngular, TranslocoModule, ActionRendererComponent, TuiButton],
  template: `
    <div class="page-container">
      <div class="header-section" style="padding: 16px">
        <h2 class="title">{{ 'MEMBER.FORMS_TITLE' | transloco }}</h2>
      </div>
      <div class="grid-wrapper">
        <ag-grid-angular
          class="ag-theme-alpine"
          style="width: 100%; height: 500px;"
          [rowData]="rowData"
          [columnDefs]="columnDefs"
          [pagination]="true"
          [paginationPageSize]="10"
          [paginationPageSizeSelector]="[5, 10, 20, 50, 100]"
          [localeText]="localeText"
          (gridReady)="onGridReady($event)"
          [animateRows]="true"
        ></ag-grid-angular>
      </div>
    </div>

    <ng-template #viewDialog let-observer>
      <div class="view-detail" *ngIf="selectedForm">
        <div class="detail-row">
          <span class="label">ID:</span>
          <span class="value">{{ selectedForm.id }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ 'MEMBER.EMAIL' | transloco }}:</span>
          <span class="value">{{ selectedForm.user.email }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ 'MEMBER.NAME' | transloco }}:</span>
          <span class="value">{{ selectedForm.user.fullName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">{{ 'MEMBER.FORM_DATA' | transloco }}:</span>
          <div class="form-data-list">
            <div *ngFor="let item of getParsedFormData(selectedForm.formData) | keyvalue" class="form-item">
              <span class="item-key">{{ item.key }}:</span>
              <span class="item-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
        <button tuiButton size="m" (click)="observer.complete()">{{ 'COMMON.CLOSE' | transloco }}</button>
      </div>
    </ng-template>

    <style>
      .view-detail { padding: 4px; }
      .detail-row { display: flex; flex-direction: column; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
      .detail-row .label { font-weight: 600; color: #666; margin-bottom: 4px; }
      .detail-row .value { color: #333; }
      .form-data-list { background: #f9f9f9; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
      .form-item { border-bottom: 1px dashed #e0e0e0; padding-bottom: 4px; }
      .form-item:last-child { border-bottom: none; }
      .item-key { font-weight: 600; color: #555; margin-right: 8px; }
      .item-value { color: #000; }
    </style>
  `,
  styleUrls: ['../pricing-rules/pricing-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormsComponent implements OnInit, OnDestroy {
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  selectedForm: B2BRegistrationForm | null = null;

  rowData: B2BRegistrationForm[] = [];
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  localeText: any = {};
  private langSub?: Subscription;

  constructor(
    private api: ApiService, 
    private cdr: ChangeDetectorRef, 
    private transloco: TranslocoService, 
    private languageService: LanguageService,
    private dialogs: TuiDialogService
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

  getParsedFormData(data: any): any {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      // If it's a string that contains double-escaped JSON (like in the DB)
      return JSON.parse(data);
    } catch (e) {
      return { 'Raw Data': data };
    }
  }

  loadData(): void {
    this.api.getB2BRegistrationForms().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 70 },
      { field: 'user.email', headerValueGetter: () => this.transloco.translate('MEMBER.EMAIL'), flex: 1 },
      { field: 'user.fullName', headerValueGetter: () => this.transloco.translate('MEMBER.NAME'), flex: 1 },
      { 
        headerValueGetter: () => this.transloco.translate('COMMON.ACTIONS'),
        width: 150,
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: B2BRegistrationForm) => this.onView(data)
          // No edit/delete for survey forms currently
        }
      }
    ];
  }

  onView(form: B2BRegistrationForm): void {
    this.selectedForm = form;
    this.dialogs.open(this.viewDialogTemplate, { size: 'l', label: this.transloco.translate('MEMBER.FORM_DETAIL') })
      .subscribe();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
}
