/**
 * Map tên màu (VN / EN thông dụng) → hex cho PDP & admin.
 * Tên không khớp: chấp nhận #rgb/#rrggbb; không thì màu ổn định theo hash chuỗi.
 */

/** Tên hiển thị / giá trị biến thể (ưu tiên tiếng Việt thống nhất với form admin). */
export const COLOR_NAME_HEX_MAP: Readonly<Record<string, string>> = {
  // Tiếng Việt
  Đỏ: '#dc2626',
  Đen: '#171717',
  Trắng: '#ffffff',
  Xanh: '#2563eb',
  Vàng: '#facc15',
  Hồng: '#db2777',
  Xám: '#6b7280',
  Nâu: '#78350f',
  Kem: '#fef3c7',
  Rêu: '#166534',
  Be: '#f5f5dc',
  Tím: '#7c3aed',
  Cam: '#ea580c',
  'Xanh lá': '#16a34a',
  'Xanh dương': '#1d4ed8',
  'Xanh navy': '#1e3a8a',
  'Xanh rêu': '#3f6212',
  Than: '#334155',
  Bạc: '#9ca3af',
  'Xanh mint': '#34d399',
  'Xanh ngọc': '#14b8a6',
  Indigo: '#4f46e5',
  'Hồng đào': '#fda4af',
  Đồng: '#b45309',
  Champagne: '#f7e7ce',
  'Trắng ngà': '#fffff0',
  'Đen nhám': '#1f2937',
  // Thêm từ khóa lạ / mô tả (một phần)
  'Neon xanh': '#22d3ee',
  'Neon hồng': '#f472b6',
  'Neon vàng': '#fde047',
  'Neon cam': '#fb923c',
  'Neon lime': '#a3e635',
  'Xanh neon': '#22d3ee',
  'Vàng neon': '#fde047',
  // English (cùng giá trị chip nếu admin nhập EN)
  Red: '#dc2626',
  Black: '#171717',
  White: '#ffffff',
  Blue: '#2563eb',
  Yellow: '#facc15',
  Pink: '#db2777',
  Gray: '#6b7280',
  Grey: '#6b7280',
  Brown: '#78350f',
  Cream: '#fef3c7',
  Olive: '#166534',
  Beige: '#f5f5dc',
  Purple: '#7c3aed',
  Orange: '#ea580c',
  Green: '#16a34a',
  Navy: '#1e3a8a',
  Charcoal: '#334155',
  Silver: '#9ca3af',
  Mint: '#34d399',
  Teal: '#14b8a6',
  Coral: '#fb7185',
  'Neon green': '#a3e635',
  Lime: '#84cc16',
  Magenta: '#d946ef',
  Turquoise: '#2dd4bf',
  Gold: '#eab308',
  Khaki: '#a3a37a',
  Maroon: '#7f1d1d',
  Burgundy: '#881337',
  Lavender: '#c4b5fd',
  Ivory: '#fffff0',
};

const LOWER_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(COLOR_NAME_HEX_MAP)) {
    m.set(k.trim().toLowerCase(), v);
  }
  return m;
})();

export interface PresetColorSwatch {
  /** Giá trị ghi vào biến thể / chip (tiếng Việt, thống nhất PDP). */
  label: string;
  hex: string;
}

/** Bảng màu gợi ý trên form admin (bấm thêm nhanh, có thể bấm nhiều ô). */
export const PRESET_COLOR_SWATCHES: readonly PresetColorSwatch[] = [
  { label: 'Đỏ', hex: '#dc2626' },
  { label: 'Đen', hex: '#171717' },
  { label: 'Trắng', hex: '#ffffff' },
  { label: 'Xanh dương', hex: '#1d4ed8' },
  { label: 'Xanh navy', hex: '#1e3a8a' },
  { label: 'Xanh lá', hex: '#16a34a' },
  { label: 'Vàng', hex: '#facc15' },
  { label: 'Cam', hex: '#ea580c' },
  { label: 'Hồng', hex: '#db2777' },
  { label: 'Tím', hex: '#7c3aed' },
  { label: 'Nâu', hex: '#78350f' },
  { label: 'Xám', hex: '#6b7280' },
  { label: 'Than', hex: '#334155' },
  { label: 'Kem', hex: '#fef3c7' },
  { label: 'Be', hex: '#f5f5dc' },
  { label: 'Rêu', hex: '#166534' },
  { label: 'Xanh mint', hex: '#34d399' },
  { label: 'Neon lime', hex: '#a3e635' },
  { label: 'Neon hồng', hex: '#f472b6' },
  { label: 'Bạc', hex: '#9ca3af' },
] as const;

function expandShortHex(hex: string): string {
  const h = hex.slice(1);
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return `#${h.toLowerCase()}`;
}

/** Chuỗi #rrggbb hoặc #rgb hợp lệ → chuẩn hóa; không phải hex → null. */
function tryParseUserHex(raw: string): string | null {
  const t = raw.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) {
    return expandShortHex(t);
  }
  return null;
}

function hashToHslBackground(label: string): string {
  let h = 5381;
  for (let i = 0; i < label.length; i++) {
    h = (h << 5) + h + label.charCodeAt(i);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 52% 46%)`;
}

/**
 * Màu nền ô tròn PDP (hoặc admin): ưu tiên map → hex người dùng → hsl ổn định theo chuỗi.
 */
export function resolveColorHex(label: string): string {
  const raw = (label || '').trim();
  if (!raw) return '#94a3b8';
  const userHex = tryParseUserHex(raw);
  if (userHex) return userHex;
  const byLower = LOWER_MAP.get(raw.toLowerCase());
  if (byLower) return byLower;
  return hashToHslBackground(raw);
}

/** Ô sáng màu (viền/check) — theo hex hoặc tên. */
export function isLightColorForSwatch(label: string): boolean {
  const hex = resolveColorHex(label).toLowerCase();
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq > 200;
  }
  const t = label.trim();
  return /trắng|kem|be|ivory|white|cream|champagne/i.test(t);
}
