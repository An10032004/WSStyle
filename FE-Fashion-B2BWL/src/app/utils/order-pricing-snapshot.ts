import type { CartItem } from '../services/cart.service';
import type { Order } from '../services/api.service';

/** Chuỗi lưu cùng order line — đối chiếu khi reorder / hỗ trợ khách. */
export function buildOrderItemPricingNote(item: CartItem): string | undefined {
  const parts: string[] = [];
  const label = item.discountLabel?.trim();
  if (label) parts.push(label);
  if (
    item.isFixedPrice &&
    item.bundleId != null &&
    label &&
    !label.toLowerCase().includes('combo')
  ) {
    parts.push(item.bundleLabel ? `Combo: ${item.bundleLabel}` : 'Giá combo cố định');
  }
  if (item.basePrice != null && Math.round(item.basePrice) > Math.round(item.price) + 0.5) {
    const bp = Math.round(item.basePrice).toLocaleString('vi-VN');
    const p = Math.round(item.price).toLocaleString('vi-VN');
    parts.push(`Giá niêm yết variant: ${bp}đ → áp dụng: ${p}đ`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

/** Giải thích reorder: giá tính lại + tóm tắt ưu đãi đơn cũ. */
export function buildReorderPricingNotice(order: Order): string {
  const bits: string[] = [
    'Giá trong giỏ được tính lại theo bảng giá và ưu đãi hiện tại (có thể khác đơn gốc).',
  ];
  if (order.couponCode) {
    const d =
      order.discountAmount != null && order.discountAmount > 0
        ? `, giảm ${Math.round(order.discountAmount).toLocaleString('vi-VN')}đ`
        : '';
    bits.push(`Đơn cũ có mã ${order.couponCode}${d}.`);
  }
  const lineNotes = (order.items || [])
    .map(i => i.pricingNote)
    .filter((n): n is string => !!n?.trim());
  if (lineNotes.length) {
    bits.push(`Ưu đãi từng dòng đã ghi nhận: ${lineNotes.join(' | ')}`);
  }
  return bits.join(' ');
}
