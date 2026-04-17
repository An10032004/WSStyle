import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VnAddressService,
  VN_V2_DIRECT_DISTRICT_CODE,
  VN_V2_DIRECT_DISTRICT_NAME,
  VnDistrict,
  VnProvince,
  VnWard,
} from '../../../services/vn-address.service';

export interface VnAddressPayload {
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  addressDetail: string;
  /** Một dòng đầy đủ để lưu đơn hàng */
  fullLine: string;
  /** JSON lưu hồ sơ user */
  json: string;
}

@Component({
  selector: 'app-vn-address-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vn-address-form.html',
  styleUrls: ['./vn-address-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnAddressFormComponent implements OnInit, OnChanges {
  @Input() initialJson: string | null | undefined;
  /** Khi true, không emit tự động lúc khởi tạo (tránh vòng lặp) */
  @Input() skipInitialEmit = false;
  /** Xếp 3 select theo cột dọc (tránh chữ tỉnh bị cắt khi khung hẹp, ví dụ trang hồ sơ). */
  @Input() layoutStacked = false;

  @Output() valueChange = new EventEmitter<VnAddressPayload | null>();

  provinces: VnProvince[] = [];
  districts: VnDistrict[] = [];
  wards: VnWard[] = [];

  provinceCode = '';
  districtCode = '';
  wardCode = '';
  addressDetail = '';

  loadingProvinces = false;

  constructor(
    private readonly vn: VnAddressService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadingProvinces = true;
    this.vn.getProvinces().subscribe((list) => {
      this.provinces = list;
      this.loadingProvinces = false;
      this.cdr.markForCheck();
      this.applyInitialJson();
      if (!this.skipInitialEmit) {
        this.emitIfComplete();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialJson'] && this.provinces.length) {
      this.applyInitialJson();
    }
  }

  onProvinceChange(): void {
    this.districtCode = '';
    this.wardCode = '';
    this.districts = [];
    this.wards = [];
    if (!this.provinceCode) {
      this.emitIfComplete();
      return;
    }
    this.vn.getDistricts(this.provinceCode).subscribe((d) => {
      this.districts = d;
      if (d.length === 1 && d[0].code === VN_V2_DIRECT_DISTRICT_CODE) {
        this.districtCode = VN_V2_DIRECT_DISTRICT_CODE;
        this.vn.getWardsForProvince(this.provinceCode).subscribe((w) => {
          this.wards = w;
          this.cdr.markForCheck();
          this.emitIfComplete();
        });
      } else {
        this.cdr.markForCheck();
        this.emitIfComplete();
      }
    });
  }

  onDistrictChange(): void {
    this.wardCode = '';
    this.wards = [];
    if (!this.districtCode || !this.provinceCode) {
      this.emitIfComplete();
      return;
    }
    if (this.districtCode === VN_V2_DIRECT_DISTRICT_CODE) {
      this.vn.getWardsForProvince(this.provinceCode).subscribe((w) => {
        this.wards = w;
        this.cdr.markForCheck();
        this.emitIfComplete();
      });
      return;
    }
    this.emitIfComplete();
  }

  onWardOrDetailChange(): void {
    this.emitIfComplete();
  }

  private applyInitialJson(): void {
    if (!this.initialJson || !this.provinces.length) return;
    try {
      const o = JSON.parse(this.initialJson) as Partial<VnAddressPayload>;
      if (o.provinceCode) this.provinceCode = String(o.provinceCode);
      if (this.provinceCode) {
        this.vn.getDistricts(this.provinceCode).subscribe((d) => {
          this.districts = d;
          this.districtCode = VN_V2_DIRECT_DISTRICT_CODE;
          this.vn.getWardsForProvince(this.provinceCode).subscribe((w) => {
            this.wards = w;
            if (o.wardCode) {
              const wc = String(o.wardCode);
              if (w.some((x) => x.code === wc)) this.wardCode = wc;
            }
            if (o.addressDetail) this.addressDetail = o.addressDetail;
            this.cdr.markForCheck();
            this.emitIfComplete();
          });
        });
      }
    } catch {
      /* ignore */
    }
  }

  private emitIfComplete(): void {
    const p = this.provinces.find((x) => x.code === this.provinceCode);
    const d = this.districts.find((x) => x.code === this.districtCode);
    const w = this.wards.find((x) => x.code === this.wardCode);
    if (!p || !d || !w || !this.addressDetail.trim()) {
      this.valueChange.emit(null);
      return;
    }
    const detail = this.addressDetail.trim();
    const isV2Direct = d.code === VN_V2_DIRECT_DISTRICT_CODE;
    const districtNameOut = isV2Direct ? VN_V2_DIRECT_DISTRICT_NAME : d.name;
    const fullLine = isV2Direct ? `${detail}, ${w.name}, ${p.name}` : `${detail}, ${w.name}, ${d.name}, ${p.name}`;
    const payload: VnAddressPayload = {
      provinceCode: p.code,
      provinceName: p.name,
      districtCode: d.code,
      districtName: districtNameOut,
      wardCode: w.code,
      wardName: w.name,
      addressDetail: detail,
      fullLine,
      json: JSON.stringify({
        provinceCode: p.code,
        provinceName: p.name,
        districtCode: d.code,
        districtName: districtNameOut,
        wardCode: w.code,
        wardName: w.name,
        addressDetail: detail,
        fullLine,
      }),
    };
    this.valueChange.emit(payload);
  }
}
