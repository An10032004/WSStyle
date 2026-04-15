/**
 * Biến thể «ngừng bán» trong admin dùng status === 'INACTIVE'.
 * Thiếu status coi như đang mở bán (tương thích dữ liệu cũ).
 */
export function isVariantAvailableForSale(
  v: { status?: string | null } | null | undefined,
): boolean {
  if (!v) return false;
  const s = (v.status ?? 'ACTIVE').toString().toUpperCase();
  return s !== 'INACTIVE';
}
