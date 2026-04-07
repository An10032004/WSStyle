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
  categoryId: number | null | undefined
): boolean {
  const t = applyProductType;
  if (!t || t === 'ALL') return true;
  if (!applyProductValue) return false;
  try {
    const val = JSON.parse(applyProductValue) as {
      categoryIds?: number[];
      productIds?: number[];
    };
    if (t === 'CATEGORY' || t === 'GROUP') {
      const categoryIds = val.categoryIds ?? [];
      if (categoryId == null) return false;
      return categoryIds.includes(categoryId);
    }
    if (t === 'SPECIFIC') {
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
  }
): boolean {
  return (
    matchesRuleCustomer(rule.applyCustomerType, rule.applyCustomerValue, ctx.user) &&
    matchesRuleProduct(rule.applyProductType, rule.applyProductValue, ctx.productId, ctx.categoryId)
  );
}
