/**
 * Nhãn trạng thái admin (AG Grid / HTML thuần): class màu dùng chung, tránh phụ thuộc tui-badge trong ô lưới.
 */

export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Trạng thái đơn hàng (API: PENDING, PROCESSING, SHIPPED, …). */
export function adminOrderStatusPillClass(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PENDING: 'admin-status-pill admin-status-pill--order-pending',
    PROCESSING: 'admin-status-pill admin-status-pill--order-processing',
    SHIPPED: 'admin-status-pill admin-status-pill--order-shipped',
    COMPLETED: 'admin-status-pill admin-status-pill--order-completed',
    APPROVED: 'admin-status-pill admin-status-pill--order-approved',
    CANCELLED: 'admin-status-pill admin-status-pill--order-cancelled',
    REJECTED: 'admin-status-pill admin-status-pill--order-rejected',
  };
  return map[s] || 'admin-status-pill admin-status-pill--unknown';
}

/** Trạng thái thanh toán. */
export function adminPaymentStatusPillClass(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PAID: 'admin-status-pill admin-status-pill--payment-paid',
    REFUNDED: 'admin-status-pill admin-status-pill--payment-refunded',
    AWAITING_CONFIRMATION: 'admin-status-pill admin-status-pill--payment-awaiting',
    FAILED: 'admin-status-pill admin-status-pill--payment-failed',
    PENDING: 'admin-status-pill admin-status-pill--payment-pending',
    UNPAID: 'admin-status-pill admin-status-pill--payment-pending',
  };
  return map[s] || 'admin-status-pill admin-status-pill--unknown';
}

/** Trạng thái duyệt đăng ký khách (APPROVED / PENDING / REJECTED). */
export function adminRegistrationStatusPillClass(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED') return 'admin-status-pill admin-status-pill--reg-approved';
  if (s === 'PENDING') return 'admin-status-pill admin-status-pill--reg-pending';
  if (s === 'REJECTED') return 'admin-status-pill admin-status-pill--reg-rejected';
  return 'admin-status-pill admin-status-pill--unknown';
}

/** ACTIVE / INACTIVE (rule, bundle, …). */
export function adminLifecycleStatusPillClass(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return 'admin-status-pill admin-status-pill--active';
  if (s === 'INACTIVE') return 'admin-status-pill admin-status-pill--inactive';
  return 'admin-status-pill admin-status-pill--unknown';
}

/** Đồng bộ AI: đã có nội dung / đang chờ. */
export function adminAiSyncPillClass(hasContent: boolean): string {
  return hasContent
    ? 'admin-status-pill admin-status-pill--sync-done'
    : 'admin-status-pill admin-status-pill--sync-pending';
}
