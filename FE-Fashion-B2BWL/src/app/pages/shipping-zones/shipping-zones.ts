import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiAlertService, TuiButton } from '@taiga-ui/core';
import { TranslocoModule } from '@jsverse/transloco';
import { ApiService, ShippingZone } from '../../services/api.service';
import { VnAddressService, VnProvince } from '../../services/vn-address.service';

@Component({
  selector: 'app-shipping-zones',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TranslocoModule],
  templateUrl: './shipping-zones.html',
  styleUrls: ['./shipping-zones.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingZonesComponent implements OnInit {
  /** Khi true: nhúng trong tab Phí vận chuyển (không full-page). */
  @Input() embedded = false;

  zones: ShippingZone[] = [];
  provinces: VnProvince[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;

  form = {
    name: '',
    status: 'ACTIVE',
    selectedCodes: [] as string[],
    standardFee: 0,
    expressFee: 0,
  };

  provinceSearch = '';

  constructor(
    private readonly api: ApiService,
    private readonly vn: VnAddressService,
    private readonly alerts: TuiAlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.reload();
    this.vn.getProvinces().subscribe((list) => {
      this.provinces = list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      this.cdr.markForCheck();
    });
  }

  reload(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.api.getShippingZones().subscribe({
      next: (data) => {
        this.zones = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.alerts.open('Không tải được vùng giao hàng.', { appearance: 'error' }).subscribe();
      },
    });
  }

  filteredProvinces(): VnProvince[] {
    const q = this.provinceSearch.trim().toLowerCase();
    if (!q) return this.provinces;
    return this.provinces.filter((p) => p.name.toLowerCase().includes(q) || p.code.includes(q));
  }

  isSelected(code: string): boolean {
    return this.form.selectedCodes.includes(code);
  }

  toggleProvince(code: string, checked: boolean): void {
    if (checked && !this.form.selectedCodes.includes(code)) {
      this.form.selectedCodes = [...this.form.selectedCodes, code];
    } else if (!checked) {
      this.form.selectedCodes = this.form.selectedCodes.filter((c) => c !== code);
    }
    this.cdr.markForCheck();
  }

  openNew(): void {
    this.editingId = null;
    this.form = {
      name: '',
      status: 'ACTIVE',
      selectedCodes: [],
      standardFee: 0,
      expressFee: 0,
    };
    this.provinceSearch = '';
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(z: ShippingZone): void {
    this.editingId = z.id;
    let codes: string[] = [];
    try {
      const parsed = JSON.parse(z.provinceCodes || '[]');
      codes = Array.isArray(parsed) ? parsed.map((c: unknown) => String(c)) : [];
    } catch {
      codes = [];
    }
    this.form = {
      name: z.name,
      status: z.status,
      selectedCodes: codes,
      standardFee: z.standardFee,
      expressFee: z.expressFee,
    };
    this.provinceSearch = '';
    this.showForm = true;
    this.cdr.markForCheck();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.name?.trim()) {
      this.alerts.open('Vui lòng nhập tên vùng.', { appearance: 'warning' }).subscribe();
      return;
    }
    if (!this.form.selectedCodes.length) {
      this.alerts.open('Chọn ít nhất một tỉnh / thành phố.', { appearance: 'warning' }).subscribe();
      return;
    }
    const body = {
      name: this.form.name.trim(),
      priority: 0,
      status: this.form.status,
      provinceCodes: JSON.stringify(this.form.selectedCodes),
      standardFee: Number(this.form.standardFee) || 0,
      expressFee: Number(this.form.expressFee) || 0,
    };
    this.saving = true;
    this.cdr.markForCheck();
    const req$ =
      this.editingId != null
        ? this.api.updateShippingZone(this.editingId, body)
        : this.api.createShippingZone(body);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.reload();
        this.alerts.open('Đã lưu vùng giao hàng.', { appearance: 'success', autoClose: 2500 }).subscribe();
      },
      error: (err) => {
        this.saving = false;
        this.cdr.markForCheck();
        const msg = err?.error?.message || err?.message || 'Lưu thất bại.';
        this.alerts.open(msg, { appearance: 'error' }).subscribe();
      },
    });
  }

  confirmDelete(z: ShippingZone): void {
    if (!confirm(`Xóa vùng "${z.name}"?`)) return;
    this.api.deleteShippingZone(z.id).subscribe({
      next: () => {
        this.reload();
        this.alerts.open('Đã xóa.', { appearance: 'success', autoClose: 2000 }).subscribe();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Xóa thất bại.';
        this.alerts.open(msg, { appearance: 'error' }).subscribe();
      },
    });
  }

  provinceCount(z: ShippingZone): number {
    try {
      const arr = JSON.parse(z.provinceCodes || '[]');
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  }

  /** Danh sách tên tỉnh để hiển thị ngoài bảng (không cần mở sửa). */
  provinceNamesLabel(z: ShippingZone): string {
    let codes: string[] = [];
    try {
      const parsed = JSON.parse(z.provinceCodes || '[]');
      codes = Array.isArray(parsed) ? parsed.map((c: unknown) => String(c)) : [];
    } catch {
      return '';
    }
    if (!codes.length || !this.provinces.length) return '';
    const byCode = new Map(this.provinces.map((p) => [p.code, p.name] as const));
    const names = codes.map((c) => byCode.get(c) || c).sort((a, b) => a.localeCompare(b, 'vi'));
    return names.join(' · ');
  }
}
