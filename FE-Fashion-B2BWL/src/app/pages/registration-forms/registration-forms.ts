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
      <div class="page-header">
        <h2 class="tui-text_h3 page-header__title">{{ 'MEMBER.FORMS_TITLE' | transloco }}</h2>
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
      <div class="registration-detail-dialog" *ngIf="selectedForm">
        <div class="detail-field">
          <div class="choice-field__label">ID</div>
          <div class="detail-field-value">{{ selectedForm.id }}</div>
        </div>
        <div class="detail-field">
          <div class="choice-field__label">{{ 'MEMBER.EMAIL' | transloco }}</div>
          <div class="detail-field-value">{{ selectedForm.user.email }}</div>
        </div>
        <div class="detail-field">
          <div class="choice-field__label">{{ 'MEMBER.NAME' | transloco }}</div>
          <div class="detail-field-value">{{ selectedForm.user.fullName }}</div>
        </div>
        <div class="detail-field">
          <div class="choice-field__label">{{ 'MEMBER.FORM_DATA' | transloco }}</div>
          <div class="form-data-list">
            <div *ngFor="let item of getParsedFormData(selectedForm.formData) | keyvalue" class="form-item">
              <div class="form-item-key">{{ item.key }}</div>
              <div class="form-item-value">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="registration-detail-actions">
        <button tuiButton size="m" (click)="observer.complete()">{{ 'COMMON.CLOSE' | transloco }}</button>
      </div>
    </ng-template>
  `,
  styleUrl: './registration-forms.scss',
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
    this.api.getB2BForms().subscribe(data => {
      this.rowData = data;
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 100, pinned: 'left' },
      { field: 'user.email', headerValueGetter: () => this.transloco.translate('MEMBER.EMAIL'), width: 250 },
      { 
        field: 'user.fullName', 
        headerValueGetter: () => this.transloco.translate('MEMBER.NAME'), 
        width: 250,
        pinned: 'left',
        tooltipValueGetter: (params: any) => params.value
      },
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
