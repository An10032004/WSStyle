import { OrderLimit } from '../services/api.service';
import { orderLimitRulesOverlapOnTargeting } from './rule-targeting';

/** Đồng bộ với OrderLimitService.orderLimitPrecedenceKey (backend). */
export function isMinOrderQtyType(t?: string | null): boolean {
  return t === 'MIN_ORDER_QTY' || t === 'MIN_ORDER_QUANTITY';
}

export function isMaxOrderQtyType(t?: string | null): boolean {
  return t === 'MAX_ORDER_QTY' || t === 'MAX_ORDER_QUANTITY';
}

function isMinAmt(t?: string | null): boolean {
  return t === 'MIN_ORDER_VALUE' || t === 'MIN_ORDER_AMOUNT';
}

function isMaxAmt(t?: string | null): boolean {
  return t === 'MAX_ORDER_AMOUNT';
}

function normCustType(r: OrderLimit): string {
  const t = r.applyCustomerType;
  return t == null || t === '' ? 'ALL' : t;
}

function normProdType(r: OrderLimit): string {
  const t = r.applyProductType;
  return t == null || t === '' ? 'ALL' : t;
}

/** Đồng bộ với OrderLimitService.precedenceKeyCore (null/empty KH & SP → ALL). */
export function orderLimitPrecedenceKey(r: OrderLimit): string {
  const level = r.limitLevel ?? 'PER_ORDER';
  const lt = r.limitType ?? '';
  const sep = '\u0001';
  if (isMinOrderQtyType(lt) || isMaxOrderQtyType(lt)) {
    return ['QTY', level, normCustType(r), r.applyCustomerValue, normProdType(r), r.applyProductValue].join(sep);
  }
  if (isMinAmt(lt) || isMaxAmt(lt)) {
    return ['AMT', level, normCustType(r), r.applyCustomerValue, normProdType(r), r.applyProductValue].join(sep);
  }
  return ['UNK', lt, level, normCustType(r), r.applyCustomerValue, normProdType(r), r.applyProductValue].join(sep);
}

function isKnownQtyOrAmtType(lt: string): boolean {
  return (
    isMinOrderQtyType(lt) ||
    isMaxOrderQtyType(lt) ||
    isMinAmt(lt) ||
    isMaxAmt(lt)
  );
}

/** Giống Comparator.nullsLast(Integer::compareTo) trên BE. */
function ruleCmp(a: OrderLimit, b: OrderLimit): number {
  const aNull = a.priority == null;
  const bNull = b.priority == null;
  if (aNull && bNull) {
    return (a.id ?? 0) - (b.id ?? 0);
  }
  if (aNull) {
    return 1;
  }
  if (bNull) {
    return -1;
  }
  if (a.priority !== b.priority) {
    return a.priority! - b.priority!;
  }
  return (a.id ?? 0) - (b.id ?? 0);
}

function prioritiesEqual(
  a: number | null | undefined,
  b: number | null | undefined
): boolean {
  return (a == null && b == null) || a === b;
}

function isPerLineLevel(l: string): boolean {
  return l === 'PER_PRODUCT' || l === 'PER_VARIANT';
}

function exclusiveLimitLevelBucket(r: OrderLimit): string {
  const l = r.limitLevel ?? 'PER_ORDER';
  return isPerLineLevel(l) ? 'PER_LINE' : l;
}

/** Đồng bộ OrderLimitService.sameExclusiveCompetitionBucket. */
function sameExclusiveCompetitionBucket(a: OrderLimit, b: OrderLimit): boolean {
  const la = exclusiveLimitLevelBucket(a);
  const lb = exclusiveLimitLevelBucket(b);
  if (la !== lb) {
    return false;
  }
  const ta = a.limitType ?? '';
  const tb = b.limitType ?? '';
  const qtyA = isMinOrderQtyType(ta) || isMaxOrderQtyType(ta);
  const qtyB = isMinOrderQtyType(tb) || isMaxOrderQtyType(tb);
  const amtA = isMinAmt(ta) || isMaxAmt(ta);
  const amtB = isMinAmt(tb) || isMaxAmt(tb);
  if (qtyA && qtyB) {
    return isMinOrderQtyType(ta) === isMinOrderQtyType(tb);
  }
  if (amtA && amtB) {
    return isMinAmt(ta) === isMinAmt(tb);
  }
  return false;
}

/** Đồng bộ OrderLimitService.dedupeOverlappingByPriority. */
export function dedupeOverlappingOrderLimitsByPriority(rules: OrderLimit[]): OrderLimit[] {
  const sorted = [...rules].sort(ruleCmp);
  const out: OrderLimit[] = [];
  for (const r of sorted) {
    const dominated = out.some(
      (w) => sameExclusiveCompetitionBucket(w, r) && orderLimitRulesOverlapOnTargeting(w, r)
    );
    if (!dominated) {
      out.push(r);
    }
  }
  return out;
}

/**
 * Đồng bộ OrderLimitService.resolveWinningRules + dedupeOverlappingByPriority:
 * gom precedence key, tầng priority, rồi loại quy tắc overlap KH+SP (như bảng giá).
 */
export function resolveOrderLimitWinners(rules: OrderLimit[]): OrderLimit[] {
  const byKey = new Map<string, OrderLimit[]>();
  for (const r of rules) {
    const k = orderLimitPrecedenceKey(r);
    if (!byKey.has(k)) {
      byKey.set(k, []);
    }
    byKey.get(k)!.push(r);
  }
  const out: OrderLimit[] = [];
  for (const group of byKey.values()) {
    group.sort(ruleCmp);
    const bestP = group[0]?.priority;
    const tier: OrderLimit[] = [];
    for (const r of group) {
      if (prioritiesEqual(r.priority, bestP)) {
        tier.push(r);
      } else {
        break;
      }
    }
    tier.sort(ruleCmp);
    const lt0 = tier[0]?.limitType ?? '';
    if (!isKnownQtyOrAmtType(lt0)) {
      if (tier[0]) {
        out.push(tier[0]);
      }
      continue;
    }
    const pick = (pred: (t?: string | null) => boolean) => tier.find((r) => pred(r.limitType));
    const wMinQ = pick(isMinOrderQtyType);
    const wMaxQ = pick(isMaxOrderQtyType);
    const wMinA = pick(isMinAmt);
    const wMaxA = pick(isMaxAmt);
    if (wMinQ) {
      out.push(wMinQ);
    }
    if (wMaxQ) {
      out.push(wMaxQ);
    }
    if (wMinA) {
      out.push(wMinA);
    }
    if (wMaxA) {
      out.push(wMaxA);
    }
  }
  return dedupeOverlappingOrderLimitsByPriority(out);
}
