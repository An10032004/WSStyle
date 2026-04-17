import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface VnProvince {
  code: string;
  name: string;
}

export interface VnDistrict {
  code: string;
  name: string;
}

export interface VnWard {
  code: string;
  name: string;
}

/**
 * Dữ liệu tĩnh trong `public/assets/vn-address/` (đồng bộ từ provinces.open-api.vn v2).
 * Cập nhật: `npm run fetch:vn-address` (cần mạng một lần), rồi commit thư mục đó.
 */
const VN_ASSETS_BASE = 'assets/vn-address';

/** Mã giả lập “cấp quận” để giữ UI 3 cột tương thích; luôn dùng với getWardsForProvince */
export const VN_V2_DIRECT_DISTRICT_CODE = '__v2_direct__';
export const VN_V2_DIRECT_DISTRICT_NAME = 'Phường / Xã';

@Injectable({ providedIn: 'root' })
export class VnAddressService {
  private readonly http = inject(HttpClient);

  getProvinces(): Observable<VnProvince[]> {
    return this.http.get<unknown[]>(`${VN_ASSETS_BASE}/provinces.json`).pipe(
      map((arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((p: any) => ({
          code: String(p.code),
          name: p.name,
        }));
      }),
      catchError(() => of([])),
    );
  }

  /**
   * API v2 không trả quận/huyện; trả một mục ảo để form vẫn chọn “Phường / Xã” sau đó gọi getWardsForProvince.
   */
  getDistricts(provinceCode: string): Observable<VnDistrict[]> {
    if (!provinceCode) return of([]);
    return of([{ code: VN_V2_DIRECT_DISTRICT_CODE, name: VN_V2_DIRECT_DISTRICT_NAME }]);
  }

  /** Phường / xã từ file tĩnh `p/{mã tỉnh}.json` */
  getWardsForProvince(provinceCode: string): Observable<VnWard[]> {
    if (!provinceCode) return of([]);
    const safe = String(provinceCode).replace(/[^0-9]/g, '');
    if (!safe) return of([]);
    return this.http.get<any>(`${VN_ASSETS_BASE}/p/${safe}.json`).pipe(
      map((body) => {
        const wards = body?.wards ?? [];
        return Array.isArray(wards) ? wards.map((w: any) => ({ code: String(w.code), name: w.name })) : [];
      }),
      catchError(() => of([])),
    );
  }
}
