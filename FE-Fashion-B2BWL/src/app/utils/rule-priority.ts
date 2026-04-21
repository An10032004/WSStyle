/**
 * Đồng bộ với RuleCoreService.GLOBAL_BLOCKING_PRIORITY:
 * priority = 1 + ALL khách + ALL sản phẩm → quy tắc khóa toàn cục, không rule cùng loại nào khác được chọn.
 */
export const GLOBAL_BLOCKING_PRIORITY = 1;

export function isApplyAllCustomers(type?: string | null): boolean {
  return !type || type === 'ALL';
}

export function isApplyAllProducts(type?: string | null): boolean {
  return !type || type === 'ALL';
}

export function isGlobalBlockingRule(
  priority: number | null | undefined,
  applyCustomerType?: string | null,
  applyProductType?: string | null
): boolean {
  return (
    (priority ?? -1) === GLOBAL_BLOCKING_PRIORITY &&
    isApplyAllCustomers(applyCustomerType) &&
    isApplyAllProducts(applyProductType)
  );
}

export function pickSingleBestRule<
  T extends {
    priority?: number;
    applyCustomerType?: string;
    applyProductType?: string;
  },
>(matched: T[]): T | null {
  if (!matched.length) return null;
  const blocking = matched.filter((r) =>
    isGlobalBlockingRule(r.priority, r.applyCustomerType, r.applyProductType)
  );
  const pool = blocking.length ? blocking : matched;
  return [...pool].sort((a, b) => (a.priority ?? 999999) - (b.priority ?? 999999))[0];
}
