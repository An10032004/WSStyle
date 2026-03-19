import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiLabel, TuiNotification } from '@taiga-ui/core';
import { TuiTextfield } from '@taiga-ui/core';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { ApiService, HomeSetting } from '../../services/api.service';

@Component({
  selector: 'app-banner-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiLabel, TuiTextfield, TuiNotification, TuiTextfieldControllerModule],
  templateUrl: './banner-manager.html',
  styleUrls: ['./banner-manager.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerManagerComponent implements OnInit {
  heroBanners: string[] = ['', '', ''];
  subBanners: string[] = ['', ''];
  
  loading = false;
  success = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getHomeSettings().subscribe(settings => {
      const hero = settings.find(s => s.settingKey === 'HERO_BANNERS');
      if (hero && hero.settingValue) {
        this.heroBanners = JSON.parse(hero.settingValue);
      }
      
      const sub = settings.find(s => s.settingKey === 'SUB_BANNERS');
      if (sub && sub.settingValue) {
        this.subBanners = JSON.parse(sub.settingValue);
      }
      this.cdr.detectChanges();
    });
  }

  trackByFn(index: number): number {
    return index;
  }

  save() {
    this.loading = true;
    this.success = false;
    
    const heroReq = this.api.updateHomeSetting({
      settingKey: 'HERO_BANNERS',
      settingValue: JSON.stringify(this.heroBanners.filter(b => !!b))
    });
    
    const subReq = this.api.updateHomeSetting({
      settingKey: 'SUB_BANNERS',
      settingValue: JSON.stringify(this.subBanners.filter(b => !!b))
    });

    // Execute both
    heroReq.subscribe(() => {
      subReq.subscribe(() => {
        this.loading = false;
        this.success = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.success = false;
          this.cdr.detectChanges();
        }, 3000);
      });
    });
  }
}
