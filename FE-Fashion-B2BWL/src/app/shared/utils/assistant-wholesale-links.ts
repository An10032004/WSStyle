import type { AssistantWholesaleProductLink, Product } from '../../services/api.service';

export interface WholesaleLinkBlock {
  intro: string | null;
  links: AssistantWholesaleProductLink[];
}

/**
 * Số tin USER gần nhất (trước tin hiện tại) dùng để carryover ngữ cảnh sỉ — đồng bộ gửi BE.
 * Cần đủ dài để khách hỏi vài câu xen kẽ rồi hỏi lại giá sỉ vẫn còn carryover.
 */
export const WHOLESALE_USER_MESSAGE_WINDOW = 24;

/** Đồng bộ từ khóa với BE `AIProductHelperService.looksLikeWholesaleIntent`. */
export function looksLikeWholesaleIntent(msg: string | undefined | null): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('giá sỉ') ||
    m.includes('gia si') ||
    m.includes('áp dụng giá sỉ') ||
    m.includes('ap dung gia si') ||
    m.includes('ưu đãi sỉ') ||
    m.includes('uu dai si') ||
    m.includes('đãi sỉ') ||
    m.includes('dai si') ||
    m.endsWith('sỉ') ||
    m.includes('mua sỉ') ||
    m.includes('mua si') ||
    m.includes('bán sỉ') ||
    m.includes('ban si') ||
    m.includes('bậc giá') ||
    m.includes('bac gia') ||
    m.includes('sỉ ') ||
    m.includes(' si ') ||
    m.includes('sản phẩm sỉ') ||
    m.includes('san pham si') ||
    m.includes('sp sỉ') ||
    m.includes('sp si') ||
    m.includes('hàng sỉ') ||
    m.includes('hang si') ||
    m.includes('theo số lượng') ||
    m.includes('theo so luong') ||
    m.includes('quantity break') ||
    m.includes('bulk ')
  );
}

/** Đồng bộ BE `AIProductHelperService.looksLikeBulkOrDealerIntent` — cụm rõ nghĩa, không mở keyword vô hạn. */
export function looksLikeBulkOrDealerIntent(msg: string | undefined | null): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('mua nhiều') ||
    m.includes('mua nhieu') ||
    m.includes('mua số lượng') ||
    m.includes('mua so luong') ||
    m.includes('đặt nhiều') ||
    m.includes('dat nhieu') ||
    m.includes('số lượng lớn') ||
    m.includes('so luong lon') ||
    m.includes('đại lý') ||
    m.includes('dai ly') ||
    m.includes('nhà phân phối') ||
    m.includes('nha phan phoi') ||
    m.includes('mua buôn') ||
    m.includes('mua buon') ||
    m.includes('bán buôn') ||
    m.includes('ban buon') ||
    m.includes('theo lô') ||
    m.includes('theo lo') ||
    m.includes('nhập lô') ||
    m.includes('nhap lo') ||
    m.includes('đặt số lượng') ||
    m.includes('dat so luong') ||
    m.includes('chiết khấu theo') ||
    m.includes('chiet khau theo') ||
    m.includes('giá theo số lượng') ||
    m.includes('gia theo so luong') ||
    m.includes('moq') ||
    m.includes('b2b') ||
    m.includes('bulk order') ||
    m.includes('bulk purchase') ||
    m.includes('wholesale') ||
    m.includes('distributor') ||
    m.includes('dealer')
  );
}

/**
 * true nếu trong tối đa {@link WHOLESALE_USER_MESSAGE_WINDOW} tin USER **trước tin hiện tại** có ý sỉ / mua nhiều / đại lý… (đồng bộ BE).
 */
export function wholesaleConversationCarryoverExcludingCurrent(
  allUserMessagesChronologicalIncludingCurrent: readonly string[],
): boolean {
  if (allUserMessagesChronologicalIncludingCurrent.length < 2) {
    return false;
  }
  const prior = allUserMessagesChronologicalIncludingCurrent
    .slice(0, -1)
    .slice(-WHOLESALE_USER_MESSAGE_WINDOW);
  return prior.some((t) => looksLikeWholesaleIntent(t) || looksLikeBulkOrDealerIntent(t));
}

function hasNonEmptyQuantityBreaksJson(json: string | undefined | null): boolean {
  if (json == null) return false;
  const s = json.trim();
  if (!s || s === '[]' || s === '{}' || s.toLowerCase() === 'null') return false;
  return true;
}

function hasWholesaleLikeDiscountLabel(label: string | undefined | null): boolean {
  if (!label?.trim()) return false;
  const m = label.toLowerCase();
  return (
    m.includes('sỉ') ||
    m.includes('mua sỉ') ||
    m.includes('mua si') ||
    m.includes('gia si') ||
    m.includes('quantity') ||
    m.includes('bulk') ||
    m.includes('bậc') ||
    m.includes('bac ') ||
    m.includes('ưu đãi mua sỉ') ||
    m.includes('uu dai mua si') ||
    m.includes('b2b')
  );
}

/** Đồng bộ BE `productDtoShowsWholesaleOrBulkEvidence` — chỉ SP có bằng chứng trên thẻ API. */
export function productShowsWholesalePriceEvidence(p: Product | undefined | null): boolean {
  if (!p?.id) return false;
  if (hasNonEmptyQuantityBreaksJson(p.quantityBreaksJson)) return true;
  if (hasWholesaleLikeDiscountLabel(p.discountLabel)) return true;
  const base = Number(p.basePrice);
  const calc = Number(p.calculatedPrice ?? p.basePrice);
  if (!Number.isNaN(base) && !Number.isNaN(calc) && base > 0 && calc < base) return true;
  return false;
}

/**
 * Chỉ khi khách hỏi giá sỉ (hoặc carryover): intro + link tên SP có bằng chứng sỉ/bậc SL trên thẻ (lịch sử phiên, không có field BE).
 */
export function buildWholesaleLinkBlockFromMessage(
  userMessage: string | undefined | null,
  products: Product[] | undefined | null,
  conversationCarryover = false,
): WholesaleLinkBlock {
  if (!products?.length) {
    return { intro: null, links: [] };
  }
  const wholesaleEffective =
    conversationCarryover ||
    looksLikeWholesaleIntent(userMessage) ||
    looksLikeBulkOrDealerIntent(userMessage);
  if (!wholesaleEffective) {
    return { intro: null, links: [] };
  }
  const wholesaleProducts = products.filter(productShowsWholesalePriceEvidence);
  if (!wholesaleProducts.length) {
    return {
      intro:
        'Trong các sản phẩm hiển thị bên dưới, không có mặt hàng nào có dấu hiệu giá sỉ / bậc số lượng trên thẻ (quantityBreaksJson, nhãn ưu đãi sỉ, hoặc giá sau rule thấp hơn giá niêm). Ảnh vẫn là toàn bộ kết quả tìm.',
      links: [],
    };
  }
  const links: AssistantWholesaleProductLink[] = wholesaleProducts.map((p) => ({
    productId: p.id,
    name: (p.name && p.name.trim()) || `Sản phẩm #${p.id}`,
    path: `/product/${p.id}`,
  }));
  const intro =
    'Các sản phẩm sau có dấu hiệu giá sỉ hoặc bậc số lượng trên thẻ (theo rule và tài khoản của bạn) — bấm tên để xem chi tiết.';
  return { intro, links };
}

/**
 * Gộp block sỉ từ BE và FE: nếu BE không trả link nhưng thẻ SP trong payload vẫn có bằng chứng sỉ,
 * dùng link từ FE (tránh chỉ hiện intro “không có SP…” trong khi grid SP vẫn có giá/rule).
 */
export function resolveWholesaleLinkBlockForAiReply(
  wholesaleEffective: boolean,
  beIntro: string | null | undefined,
  beLinks: AssistantWholesaleProductLink[] | null | undefined,
  userMessage: string | undefined | null,
  products: Product[] | undefined | null,
  conversationCarryover: boolean,
): WholesaleLinkBlock {
  const fe = buildWholesaleLinkBlockFromMessage(userMessage, products, conversationCarryover);
  if (!wholesaleEffective) {
    return { intro: null, links: [] };
  }
  const beL = beLinks ?? [];
  const beI = (beIntro ?? '').trim();
  if (beL.length > 0) {
    return {
      intro: beI || fe.intro,
      links: [...beL],
    };
  }
  if (fe.links.length > 0) {
    return fe;
  }
  if (beI) {
    return { intro: beI, links: [] };
  }
  return { intro: null, links: [] };
}
