/** Ước tính số tiền giảm (đồng bộ logic hiển thị với backend CouponService.computeDiscountAmount). */
export function estimateCouponDiscountAmount(
  subtotal: number,
  coupon: { discountType: string; discountValue: number } | null | undefined,
): number {
  if (!coupon || subtotal <= 0) {
    return 0;
  }
  if (coupon.discountType === 'PERCENTAGE') {
    const d = subtotal * (coupon.discountValue / 100);
    return Math.min(d, subtotal);
  }
  return Math.min(subtotal, coupon.discountValue);
}

/** Tạm tính sau giảm (dùng cho quote ship/thuế). */
export function subtotalAfterCouponDiscount(
  subtotal: number,
  coupon: { discountType: string; discountValue: number } | null | undefined,
): number {
  const d = estimateCouponDiscountAmount(subtotal, coupon);
  return Math.max(0, subtotal - d);
}
