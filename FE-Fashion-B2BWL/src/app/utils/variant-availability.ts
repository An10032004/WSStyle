/**
 * Biến thể «ngừng bán» khi status === 'INACTIVE' hoặc sản phẩm cha INACTIVE.
 * Thiếu status coi như ACTIVE (tương thích dữ liệu cũ).
 */
export function isVariantAvailableForSale(
  v: { status?: string | null; productStatus?: string | null } | null | undefined,
  productStatus?: string | null,
): boolean {
  if (!v) return false;
  const parent = (productStatus ?? v.productStatus ?? 'ACTIVE').toString().toUpperCase();
  if (parent === 'INACTIVE') return false;
  const s = (v.status ?? 'ACTIVE').toString().toUpperCase();
  return s !== 'INACTIVE';
}
