import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridReadyEvent,
  GridApi,
  themeQuartz
} from 'ag-grid-community';
import { AG_GRID_LOCALE_VI } from '../../shared/utils/ag-grid-locale-vi';
import { TuiButton, TuiAlertService, TuiTextfield, TuiLabel, TuiIcon, TuiDialogService, TuiDataList } from '@taiga-ui/core';
import { TuiSelectModule, TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, Category, TranslationRequest } from '../../services/api.service';
import { ActionRendererComponent } from '../../shared/components/action-renderer/action-renderer.component';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, AgGridAngular, TuiButton, TuiIcon, TuiTextfield, TuiLabel, TuiDataList, TuiSelectModule, TuiTextfieldControllerModule, ActionRendererComponent],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})
export class CategoryListComponent implements OnInit {
  rowData: Category[] = [];
  gridApi!: GridApi;
  theme = themeQuartz;
  localeText: any = AG_GRID_LOCALE_VI;
  gridVisible = true;

  showForm = false;
  showDetails = false;
  selectedCategory: Category | null = null;
  editingId: number | null = null;
  originalCategory: Category | null = null;
  categoryTranslations: Map<number, string> = new Map();
  formData = { name: '', parentId: null as number | null };

  currentLanguage: string = 'vi';
  langSub!: Subscription;

  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;
  deleteTargetName: string = '';

  columnDefs: ColDef[] = [];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 100,
  };

  constructor(
    private api: ApiService,
    private alerts: TuiAlertService,
    private cdr: ChangeDetectorRef,
    private dialogs: TuiDialogService,
    public languageService: LanguageService,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    // Initial translation load
    this.transloco.selectTranslation().subscribe(() => {
      this.updateColumnDefs();
      this.loadTranslations();
      this.cdr.detectChanges();
    });

    this.langSub = this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.showForm = false;
      this.showDetails = false;
      this.localeText = lang === 'vi' ? AG_GRID_LOCALE_VI : {};

      // Force grid re-init
      this.gridVisible = false;
      this.cdr.detectChanges();

      this.transloco.selectTranslation(lang).subscribe(() => {
        this.gridVisible = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.updateColumnDefs();
          this.loadTranslations();
          this.cdr.detectChanges();
        });
      });
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.langSub) this.langSub.unsubscribe();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadData(): void {
    this.api.getCategories().subscribe((data) => {
      this.rowData = data;
      this.loadTranslations(); // Re-apply translations if in translation mode
      this.cdr.detectChanges();
    });
  }

  updateColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'ID', field: 'id', width: 100, sortable: true, cellStyle: { fontWeight: '500' }, pinned: 'left' },
      { 
        headerName: this.transloco.translate('CATEGORY.NAME'), 
        field: 'name', 
        width: 300,
        sortable: true, 
        filter: true,
        pinned: 'left',
        tooltipValueGetter: (params) => {
           const id = params.data.id;
           if (this.currentLanguage === 'vi') return params.data.name;
           return this.categoryTranslations.get(id) || params.data.name;
        },
        valueGetter: (params) => {
           const id = params.data.id;
           if (this.currentLanguage === 'vi') return params.data.name;
           return this.categoryTranslations.get(id) || params.data.name;
        }
      },
      { 
         headerName: this.transloco.translate('CATEGORY.PARENT_ID'), 
         field: 'parentId', 
         width: 140,
         valueGetter: (params) => params.data.parentId || ''
      },
      { 
         headerName: this.transloco.translate('CATEGORY.PARENT_NAME'), 
         field: 'parentName', 
         width: 180,
         valueGetter: (params) => {
            const pid = params.data.parentId;
            if (!pid || pid === params.data.id) return '';
            return this.getCategoryName(pid);
         }
      },
      {
        headerName: this.transloco.translate('PRODUCT.ACTIONS'),
        cellRenderer: ActionRendererComponent,
        cellRendererParams: {
          onView: (data: Category) => this.onView(data),
          onEdit: (data: Category) => this.onEdit(data),
          onDelete: (data: Category) => this.onDelete(data),
          lang: this.currentLanguage,
        },
        width: 260,
        sortable: false,
        filter: false,
      },
    ];
  }

  loadTranslations(): void {
    if (this.currentLanguage === 'vi') {
      // For categories, rowData already has original names. 
      // But if we came from 'en', we need to re-fetch original data to restore names.
      // loadData() is called at the end of ngOnInit or when switching to 'vi'.
      return;
    }

    this.api.getTranslationsByTypeAndLang('CATEGORY', this.currentLanguage).subscribe((data) => {
      const translatedData = this.rowData.map(p => {
        const t = data.find(item => item.resourceId === p.id);
        if (t && t.content) {
          try {
            const content = JSON.parse(t.content);
            return { ...p, name: content.name || p.name };
          } catch (e) {}
        }
        return p;
      });
      this.rowData = [...translatedData];
      this.cdr.detectChanges();
    });
  }

  onAdd(): void {
    this.editingId = null;
    this.originalCategory = null;
    this.formData = { name: '', parentId: null };
    this.showForm = true;
    this.showDetails = false;
  }

  onView(cat: Category): void {
    if (this.currentLanguage !== 'vi') {
      this.api.getTranslationByLang('CATEGORY', cat.id, this.currentLanguage).subscribe({
        next: (translation) => {
          this.selectedCategory = { ...cat };
          if (translation && translation.content) {
            try {
              const content = JSON.parse(translation.content);
              this.selectedCategory.name = content.name || cat.name;
            } catch (e) {}
          }
          this.showDetails = true;
          this.showForm = false;
          this.cdr.detectChanges();
        },
        error: () => {
           // Fallback if no translation found
           this.selectedCategory = cat;
           this.showDetails = true;
           this.showForm = false;
           this.cdr.detectChanges();
        }
      });
    } else {
      this.selectedCategory = cat;
      this.showDetails = true;
      this.showForm = false;
    }
  }

  onCloseDetails(): void {
    this.showDetails = false;
    this.selectedCategory = null;
  }

  onEdit(cat: Category): void {
    this.editingId = cat.id;
    this.originalCategory = { ...cat };
    this.showDetails = false;

    if (this.currentLanguage !== 'vi') {
      // In translation mode, fetch existing translation or prep empty
      this.formData = { name: '', parentId: cat.parentId ?? null };
      this.api.getTranslationByLang('CATEGORY', cat.id, this.currentLanguage).subscribe({
        next: (translation) => {
          if (translation && translation.content) {
            try {
               const content = JSON.parse(translation.content);
               this.formData.name = content.name || '';
            } catch(e) {}
          }
          this.showForm = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.showForm = true;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Normal edit
      this.formData = { name: cat.name, parentId: cat.parentId ?? null };
      this.showForm = true;
    }
  }

  getCategoryName(id: number | null): string {
    if (id === null) return '';
    if (this.currentLanguage !== 'vi') {
       const trans = this.categoryTranslations.get(id);
       if (trans) return trans;
    }
    return this.rowData.find(c => c.id === id)?.name || '';
  }

  readonly renderCategory = (context: any): string => {
    return this.getCategoryName(context?.$implicit);
  };

  onDelete(cat: Category): void {
    this.deleteTargetName = this.getCategoryName(cat.id);
    this.dialogs
      .open<boolean>(this.deleteDialogTemplate, {
        size: 'm',
      })
      .subscribe((response) => {
        if (response) {
          this.api.deleteCategory(cat.id).subscribe(() => {
            this.alerts.open('Đã xóa danh mục thành công', { appearance: 'success' }).subscribe();
            this.loadData();
          });
        }
      });
  }

  onSave(): void {
    if (this.formData.parentId && this.editingId === this.formData.parentId) {
      this.alerts.open('Không thể chọn danh mục này làm danh mục cha của chính nó', { appearance: 'warning' }).subscribe();
      return;
    }
    
    if (this.currentLanguage !== 'vi' && this.editingId) {
      // 1. Update Global Fields (Parent ID)
      const globalUpdate = {
        name: this.originalCategory?.name || this.formData.name,
        parentId: this.formData.parentId
      };
      
      this.api.updateCategory(this.editingId, globalUpdate).subscribe(() => {
        // 2. Save Translation for Name
        const req: TranslationRequest = {
           resourceId: this.editingId!,
           resourceType: 'CATEGORY',
           languageCode: this.currentLanguage,
           content: JSON.stringify({ name: this.formData.name })
        };
        
        this.api.saveTranslation(req).subscribe(() => {
           this.alerts.open(`Cập nhật thông tin và bản dịch [${this.currentLanguage}] thành công`, { appearance: 'success' }).subscribe();
           this.showForm = false;
           this.loadData();
        });
      });
    } else {
      // Normal save mode (vi or New)
      const body = { name: this.formData.name, parentId: this.formData.parentId };
      if (this.editingId) {
        this.api.updateCategory(this.editingId, body).subscribe(() => {
          this.alerts.open('Cập nhật thành công', { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.loadData();
        });
      } else {
        this.api.createCategory(body).subscribe(() => {
          this.alerts.open('Tạo thành công', { appearance: 'success' }).subscribe();
          this.showForm = false;
          this.loadData();
        });
      }
    }
  }

  onCancel(): void {
    this.showForm = false;
  }
}
