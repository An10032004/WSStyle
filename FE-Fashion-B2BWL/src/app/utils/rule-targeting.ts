/**
 * Đồng bộ với RuleCoreService.isCustomerMatch / isProductMatch (Fashion-B2BWL-).
 */

export interface RuleUserLike {
  customerGroup?: { id: number } | null;
}

function parseGroupIds(applyCustomerValue: string | null | undefined): number[] {
  if (!applyCustomerValue) return [];
  try {
    const val = JSON.parse(applyCustomerValue) as { groupIds?: number[]; groupId?: number };
    if (Array.isArray(val.groupIds) && val.groupIds.length) return val.groupIds;
    if (val.groupId != null) return [val.groupId];
  } catch {
    /* ignore */
  }
  return [];
}

export function matchesRuleCustomer(
  applyCustomerType: string | null | undefined,
  applyCustomerValue: string | null | undefined,
  user: RuleUserLike | null | undefined
): boolean {
  const t = applyCustomerType;
  if (!t || t === 'ALL') return true;
  if (t === 'GUEST') return !user;
  if (t === 'LOGGED_IN') return !!user;
  if (t === 'GROUP') {
    const gid = user?.customerGroup?.id;
    if (gid == null) return false;
    const ids = parseGroupIds(applyCustomerValue);
    return ids.length > 0 && ids.includes(gid);
  }
  return false;
}

export function matchesRuleProduct(
  applyProductType: string | null | undefined,
  applyProductValue: string | null | undefined,
  productId: number,
  categoryId: number | null | undefined,
  variantId?: number | null,
): boolean {
  const t = applyProductType;
  if (!t || t === 'ALL') return true;
  if (!applyProductValue) return false;
  try {
    const val = JSON.parse(applyProductValue) as {
      categoryIds?: number[];
      productIds?: number[];
      variantIds?: number[];
    };
    if (t === 'CATEGORY' || t === 'GROUP') {
      const categoryIds = val.categoryIds ?? [];
      if (categoryId == null) return false;
      return categoryIds.includes(categoryId);
    }
    if (t === 'SPECIFIC') {
      const variantIds = Array.isArray(val.variantIds) ? val.variantIds : [];
      if (variantIds.length > 0) {
        return variantId != null && variantIds.includes(variantId);
      }
      const productIds = val.productIds ?? [];
      return productIds.includes(productId);
    }
  } catch {
    return false;
  }
  return false;
}

export function ruleMatchesTargeting(
  rule: {
    applyCustomerType?: string | null;
    applyCustomerValue?: string | null;
    applyProductType?: string | null;
    applyProductValue?: string | null;
  },
  ctx: {
    productId: number;
    categoryId: number | null | undefined;
    user: RuleUserLike | null | undefined;
    variantId?: number | null;
  }
): boolean {
  return (
    matchesRuleCustomer(rule.applyCustomerType, rule.applyCustomerValue, ctx.user) &&
    matchesRuleProduct(
      rule.applyProductType,
      rule.applyProductValue,
      ctx.productId,
      ctx.categoryId,
      ctx.variantId ?? null,
    )
  );
}

function normCustomerType(t?: string | null): string {
  return t && t !== '' ? t : 'ALL';
}

function normProductType(t?: string | null): string {
  return t && t !== '' ? t : 'ALL';
}

/** Đồng bộ RuleCoreService.checkCustomerOverlap (hai quy tắc, không cần user). */
export function ruleCustomerTargetingOverlaps(
  a: { applyCustomerType?: string | null; applyCustomerValue?: string | null },
  b: { applyCustomerType?: string | null; applyCustomerValue?: string | null }
): boolean {
  const c1 = normCustomerType(a.applyCustomerType);
  const c2 = normCustomerType(b.applyCustomerType);
  if (c1 === 'ALL' || c2 === 'ALL') {
    return true;
  }
  if ((c1 === 'LOGGED_IN' && c2 === 'GROUP') || (c2 === 'LOGGED_IN' && c1 === 'GROUP')) {
    return true;
  }
  if (c1 === 'GROUP' && c2 === 'GROUP') {
    const g1 = parseGroupIds(a.applyCustomerValue);
    const g2 = parseGroupIds(b.applyCustomerValue);
    return g1.length > 0 && g2.length > 0 && g1.some((id) => g2.includes(id));
  }
  return c1 === c2;
}

function parseCategoryIds(applyProductValue: string | null | undefined): number[] {
  if (!applyProductValue) {
    return [];
  }
  try {
    const val = JSON.parse(applyProductValue) as { categoryIds?: number[]; categoryId?: number };
    if (Array.isArray(val.categoryIds) && val.categoryIds.length) {
      return val.categoryIds;
    }
    if (val.categoryId != null) {
      return [val.categoryId];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function parseProductIds(applyProductValue: string | null | undefined): number[] {
  if (!applyProductValue) {
    return [];
  }
  try {
    const val = JSON.parse(applyProductValue) as { productIds?: number[]; productId?: number };
    if (Array.isArray(val.productIds) && val.productIds.length) {
      return val.productIds;
    }
    if (val.productId != null) {
      return [val.productId];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function parseVariantIds(applyProductValue: string | null | undefined): number[] {
  if (!applyProductValue) {
    return [];
  }
  try {
    const val = JSON.parse(applyProductValue) as { variantIds?: number[] };
    if (Array.isArray(val.variantIds) && val.variantIds.length) {
      return val.variantIds;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function specificProductTargetingOverlapsJson(
  aVal: string | null | undefined,
  bVal: string | null | undefined,
): boolean {
  const v1 = parseVariantIds(aVal);
  const v2 = parseVariantIds(bVal);
  const p1 = parseProductIds(aVal);
  const p2 = parseProductIds(bVal);
  const hv1 = v1.length > 0;
  const hv2 = v2.length > 0;
  if (hv1 && hv2) {
    return v1.some((id) => v2.includes(id));
  }
  if (hv1 !== hv2) {
    return p1.length > 0 && p2.length > 0 && p1.some((id) => p2.includes(id));
  }
  return p1.length > 0 && p2.length > 0 && p1.some((id) => p2.includes(id));
}

function isProductCategoryLike(t: string): boolean {
  return t === 'CATEGORY' || t === 'GROUP';
}

/** Đồng bộ RuleCoreService.checkProductOverlap. */
export function ruleProductTargetingOverlaps(
  a: { applyProductType?: string | null; applyProductValue?: string | null },
  b: { applyProductType?: string | null; applyProductValue?: string | null }
): boolean {
  const p1 = normProductType(a.applyProductType);
  const p2 = normProductType(b.applyProductType);
  if (p1 === 'ALL' || p2 === 'ALL') {
    return true;
  }
  try {
    if (p1 === p2) {
      if (p1 === 'SPECIFIC') {
        return specificProductTargetingOverlapsJson(a.applyProductValue, b.applyProductValue);
      }
      const key = isProductCategoryLike(p1) ? 'category' : 'product';
      const ids1 = key === 'category' ? parseCategoryIds(a.applyProductValue) : parseProductIds(a.applyProductValue);
      const ids2 = key === 'category' ? parseCategoryIds(b.applyProductValue) : parseProductIds(b.applyProductValue);
      return ids1.length > 0 && ids2.length > 0 && ids1.some((id) => ids2.includes(id));
    }
    // CATEGORY vs GROUP: cùng categoryIds trong JSON (backend isProductMatch xử lý giống nhau).
    if (isProductCategoryLike(p1) && isProductCategoryLike(p2)) {
      const ids1 = parseCategoryIds(a.applyProductValue);
      const ids2 = parseCategoryIds(b.applyProductValue);
      return ids1.length > 0 && ids2.length > 0 && ids1.some((id) => ids2.includes(id));
    }
    if (isProductCategoryLike(p1) && p2 === 'SPECIFIC') return true;
    if (p1 === 'SPECIFIC' && isProductCategoryLike(p2)) return true;
    return true;
  } catch {
    return true;
  }
}

/** Hai order limit có phạm vi KH + SP chồng nhau (giống backend RuleCoreService.orderLimitTargetingOverlaps). */
export function orderLimitRulesOverlapOnTargeting(
  a: {
    applyCustomerType?: string | null;
    applyCustomerValue?: string | null;
    applyProductType?: string | null;
    applyProductValue?: string | null;
  },
  b: typeof a
): boolean {
  return ruleCustomerTargetingOverlaps(a, b) && ruleProductTargetingOverlaps(a, b);
}
