/**
 * `product.variantDimensionLabels`: JSON mảng 3 phần tử, map lần lượt color / size / weight.
 * Tương thích ngược: phần tử là chuỗi (chỉ tên) hoặc object { name, ui }.
 */
export type VariantDimUi = 'swatch' | 'buttons';

export interface VariantDimSlotParsed {
  name: string;
  ui: VariantDimUi;
}

export function defaultVariantDimSlots(): VariantDimSlotParsed[] {
  return [
    { name: '', ui: 'swatch' },
    { name: '', ui: 'buttons' },
    { name: '', ui: 'buttons' },
  ];
}

function defaultUiForIndex(index: number): VariantDimUi {
  return index === 0 ? 'swatch' : 'buttons';
}

function parseOneSlot(item: unknown, index: number): VariantDimSlotParsed {
  const defUi = defaultUiForIndex(index);
  if (item == null || item === '') {
    return { name: '', ui: defUi };
  }
  if (typeof item === 'string') {
    return { name: item.trim(), ui: defUi };
  }
  if (typeof item === 'object' && item !== null) {
    const o = item as Record<string, unknown>;
    const name = String(o['name'] ?? o['label'] ?? '').trim();
    const hasExplicit = o['ui'] != null || o['displayAs'] != null;
    const rawUi = String(o['ui'] ?? o['displayAs'] ?? '').toLowerCase();
    const ui: VariantDimUi =
      hasExplicit && rawUi === 'swatch' ? 'swatch' : hasExplicit ? 'buttons' : defUi;
    return { name, ui };
  }
  return { name: '', ui: defUi };
}

export function parseVariantDimensionSlotsFromJson(
  raw: string | null | undefined,
): VariantDimSlotParsed[] {
  const out = defaultVariantDimSlots();
  if (!raw) return out;
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return out;
    for (let i = 0; i < 3; i++) {
      out[i] = parseOneSlot(a[i], i);
    }
    return out;
  } catch {
    return out;
  }
}

export function serializeVariantDimensionSlotsJson(
  rows: Array<{ name: string; ui: VariantDimUi }>,
): string {
  const pad = [...rows];
  while (pad.length < 3) {
    pad.push({ name: '', ui: defaultUiForIndex(pad.length) });
  }
  return JSON.stringify(
    pad.slice(0, 3).map((r, i) => ({
      name: (r.name || '').trim(),
      ui: r.ui ?? defaultUiForIndex(i),
    })),
  );
}

export function variantSlotNamesOnly(slots: VariantDimSlotParsed[]): [string, string, string] {
  return [slots[0].name, slots[1].name, slots[2].name];
}
