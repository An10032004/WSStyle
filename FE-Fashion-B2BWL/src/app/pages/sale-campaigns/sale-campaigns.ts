import { Component, ChangeDetectionStrategy, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TuiIcon, TuiButton, TuiDialogService, TuiTextfield, TuiLabel } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { ApiService, SaleCampaign } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, TuiIcon, TuiButton, TuiTextfield, TuiLabel],
  template: `
    <div class="page-container" *transloco="let t">
      <div class="page-header">
        <h1 class="tui-text_h3">{{ 'SIDEBAR.CAMPAIGNS' | transloco }}</h1>
        <button tuiButton type="button" size="m" (click)="showAddDialog()">New Campaign</button>
      </div>

      <ng-template #addDialog let-observer>
        <div class="dialog-content">
          <h2 class="tui-text_h5" style="margin-bottom: 24px;">New Sale Campaign</h2>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <tui-textfield>
              <input tuiTextfield [(ngModel)]="newCampaign.name" placeholder="Summer Sale 2024" />
              Campaign Name
            </tui-textfield>
            
            <tui-textfield>
              <input tuiTextfield type="number" [(ngModel)]="newCampaign.discountPercentage" placeholder="20" />
              Discount Percentage (%)
            </tui-textfield>
          </div>
          
          <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px;">
            <button tuiButton type="button" size="m" appearance="flat" (click)="observer.complete()">Cancel</button>
            <button tuiButton type="button" size="m" (click)="observer.next(true); observer.complete()">Start Campaign</button>
          </div>
        </div>
      </ng-template>
      
      <div class="campaign-grid">
        <div *ngFor="let campaign of campaigns()" class="campaign-card">
          <img [src]="campaign.bannerUrl" class="banner" />
          <div class="card-content">
            <div class="header-row">
              <h3>{{ campaign.name }}</h3>
              <button tuiButton type="button" size="xs" appearance="flat" (click)="deleteCampaign(campaign.id)">Delete</button>
            </div>
            <p>{{ campaign.description }}</p>
            <div class="footer">
               <span class="discount">-{{ campaign.discountPercentage }}%</span>
               <span class="status" [class.active]="campaign.isActive">
                 {{ campaign.isActive ? 'Active' : 'Ended' }}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .campaign-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .campaign-card { background: #fff; border-radius: 16px; border: 1px solid #eee; overflow: hidden; }
    .banner { width: 100%; height: 160px; object-fit: cover; }
    .card-content { padding: 20px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .discount { font-weight: bold; color: #f44336; font-size: 20px; }
    .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; background: #eee; }
    .status.active { background: #e8f5e9; color: #2e7d32; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleCampaignsComponent {
  private readonly api = inject(ApiService);
  private readonly dialogs = inject(TuiDialogService);
  
  readonly campaigns = signal<SaleCampaign[]>([]);

  @ViewChild('addDialog') addDialogTemplate!: TemplateRef<any>;

  newCampaign = {
    name: '',
    discountPercentage: 0
  };

  constructor() {
    this.refresh();
  }

  async refresh() {
    const data = await firstValueFrom(this.api.getSaleCampaigns());
    this.campaigns.set(data);
  }

  showAddDialog() {
    this.newCampaign = { name: '', discountPercentage: 0 };
    this.dialogs.open<boolean>(this.addDialogTemplate, { size: 's' }).subscribe({
      next: (res) => {
        if (res) this.saveCampaign();
      }
    });
  }

  async saveCampaign() {
    await firstValueFrom(this.api.createSaleCampaign({
      name: this.newCampaign.name,
      description: 'Global Store Discount',
      bannerUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
      discountPercentage: this.newCampaign.discountPercentage,
      isActive: true
    }));
    this.refresh();
  }

  async deleteCampaign(id: number) {
    this.dialogs.open<boolean>(TUI_CONFIRM, {
      label: 'Delete Campaign',
      size: 's',
      data: {
        content: 'Are you sure you want to delete this campaign? This action cannot be undone.',
        yes: 'Delete',
        no: 'Cancel'
      }
    }).subscribe(async (res) => {
      if (res) {
        await firstValueFrom(this.api.deleteSaleCampaign(id));
        this.refresh();
      }
    });
  }
}
