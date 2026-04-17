import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ShippingSelectionMode = 'RULE' | 'STANDARD' | 'EXPRESS';

const STORAGE_KEY = 'b2bwl_shipping_prefs';

export interface ShippingPrefsSnapshot {
  selection: ShippingSelectionMode;
  provinceCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutShippingContextService {
  readonly selection$ = new BehaviorSubject<ShippingSelectionMode>('RULE');
  readonly provinceCode$ = new BehaviorSubject<string | null>(null);

  constructor() {
    this.restore();
  }

  snapshot(): ShippingPrefsSnapshot {
    return {
      selection: this.selection$.value,
      provinceCode: this.provinceCode$.value,
    };
  }

  setSelection(s: ShippingSelectionMode): void {
    this.selection$.next(s);
    this.persist();
  }

  setProvinceCode(code: string | null): void {
    this.provinceCode$.next(code && code.trim() ? code.trim() : null);
    this.persist();
  }

  loadFromUserShippingJson(json: string | null | undefined): void {
    if (!json) return;
    try {
      const o = JSON.parse(json) as { provinceCode?: string };
      if (o?.provinceCode) {
        this.setProvinceCode(String(o.provinceCode));
      }
    } catch {
      /* ignore */
    }
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const o = JSON.parse(raw) as Partial<ShippingPrefsSnapshot>;
      if (o.selection === 'RULE' || o.selection === 'STANDARD' || o.selection === 'EXPRESS') {
        this.selection$.next(o.selection);
      }
      if (o.provinceCode != null) {
        this.provinceCode$.next(String(o.provinceCode));
      }
    } catch {
      /* ignore */
    }
  }

  private persist(): void {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selection: this.selection$.value,
          provinceCode: this.provinceCode$.value,
        } satisfies ShippingPrefsSnapshot),
      );
    } catch {
      /* ignore */
    }
  }
}
