import type { Order } from '../services/api.service';

export type FlowStepState = 'done' | 'current' | 'pending' | 'failed';

export interface OrderFlowStep {
  label: string;
  state: FlowStepState;
  hint?: string;
}

function isTerminalCancelled(order: Order): boolean {
  const s = order.status?.toUpperCase();
  return s === 'CANCELLED' || s === 'REJECTED';
}

function isFulfilmentDone(order: Order): boolean {
  const s = order.status?.toUpperCase();
  return s === 'COMPLETED' || s === 'APPROVED';
}

function isVnpay(order: Order): boolean {
  return (order.paymentMethod || '').toUpperCase() === 'VNPAY';
}

/** Đơn hủy/từ chối + đã thu QR/CK — cần hoàn tiền (copy cảnh báo). */
export function needsRefundQrNotice(order: Order): boolean {
  if (!isTerminalCancelled(order)) return false;
  const ps = (order.paymentStatus || '').toUpperCase();
  return ps === 'PAID' && isVnpay(order);
}

/** Đơn hủy + QR đã thu, shop chưa đánh dấu hoàn — khách cần liên hệ. */
export function needsCustomerRefundContactNotice(order: Order): boolean {
  return needsRefundQrNotice(order) && !order.refundProcessedAt;
}

/** Shop đã đánh dấu hoàn tiền, chờ khách xác nhận. */
export function isAwaitingCustomerRefundConfirm(order: Order): boolean {
  return (
    needsRefundQrNotice(order) &&
    !!order.refundProcessedAt &&
    !order.refundConfirmedByCustomerAt &&
    (order.paymentStatus || '').toUpperCase() === 'PAID'
  );
}

export function canCustomerConfirmRefundReceived(order: Order): boolean {
  return isAwaitingCustomerRefundConfirm(order);
}

/** Trước khi hủy: cảnh báo hoàn tiền (VNPAY đã PAID). */
export function shouldWarnQrRefundOnCancel(order: Order): boolean {
  if (isTerminalCancelled(order)) return false;
  const ps = (order.paymentStatus || '').toUpperCase();
  return isVnpay(order) && ps === 'PAID';
}

/** Tiền đã vào nhưng shop chưa xác nhận đơn — giải thích vì sao không có nút "Đã nhận hàng". */
export function showFulfilmentWaitingNotice(order: Order): boolean {
  if (isTerminalCancelled(order)) return false;
  const s = (order.status || '').toUpperCase();
  const ps = (order.paymentStatus || '').toUpperCase();
  return s === 'PENDING' && ps === 'PAID';
}

/** Dòng mô tả thanh toán (song song với giao hàng). */
export function getOrderPaymentCaption(order: Order): string {
  const method = (order.paymentMethod || '').toUpperCase();
  const ps = (order.paymentStatus || '').toUpperCase();

  if (method === 'NET_TERMS') {
    if (ps === 'PAID') return 'Công nợ: đã thanh toán';
    if (order.dueDate) {
      try {
        const d = new Date(order.dueDate);
        return `Công nợ — hạn thanh toán: ${d.toLocaleDateString('vi-VN')}`;
      } catch {
        return 'Công nợ — theo điều khoản net term';
      }
    }
    return 'Công nợ — theo điều khoản net term';
  }
  if (ps === 'PAID' && (order.status || '').toUpperCase() === 'PENDING') {
    return 'Thanh toán: đã ghi nhận. Giao hàng chỉ tiến hành sau khi shop xác nhận đơn (khác với trạng thái tiền).';
  }
  if (ps === 'REFUNDED') return 'Thanh toán: đã hoàn tiền (đóng vòng hoàn trả).';
  if (ps === 'PAID') return 'Thanh toán: đã nhận đủ tiền';
  if (ps === 'AWAITING_CONFIRMATION') return 'Thanh toán: chờ shop xác nhận chuyển khoản';
  if (method === 'COD') return 'Thanh toán: COD (khi nhận hàng)';
  if (method === 'VNPAY') return 'Thanh toán: chuyển khoản / QR';
  return 'Thanh toán: đang cập nhật';
}

/** Bước hiển thị (đứng yên) theo trạng thái đơn. */
export function buildOrderFlowSteps(order: Order): OrderFlowStep[] {
  if (isTerminalCancelled(order)) {
    const failedLabel = order.status?.toUpperCase() === 'REJECTED' ? 'Đơn bị từ chối' : 'Đơn đã hủy';
    let hint = 'Tồn kho được hoàn lại nếu shop đã xác nhận đơn.';
    if (needsRefundQrNotice(order)) {
      hint +=
        ' Đơn đã thu tiền qua chuyển khoản/QR: vui lòng liên hệ shop để hoàn tiền; sau khi shop chuyển khoản, bạn xác nhận đã nhận lại tiền trên trang này.';
    }
    return [
      { label: 'Đặt hàng thành công', state: 'done' },
      { label: failedLabel, state: 'failed', hint },
    ];
  }

  const s = (order.status || 'PENDING').toUpperCase();

  const stepPlaced: OrderFlowStep = { label: 'Đặt hàng thành công', state: 'done' };

  const confirmDone = s !== 'PENDING';
  let confirmState: FlowStepState = confirmDone ? 'done' : 'current';

  const shipDone = s === 'SHIPPED' || s === 'COMPLETED' || s === 'APPROVED';
  let shipState: FlowStepState;
  if (shipDone) shipState = 'done';
  else if (s === 'PROCESSING') shipState = 'current';
  else shipState = 'pending';

  const finalDone = s === 'COMPLETED' || s === 'APPROVED';
  let finalState: FlowStepState;
  if (finalDone) finalState = 'done';
  else if (s === 'SHIPPED') finalState = 'current';
  else finalState = 'pending';

  if (s === 'PENDING') {
    confirmState = 'current';
    shipState = 'pending';
    finalState = 'pending';
  }

  const stepConfirm: OrderFlowStep = {
    label: 'Shop xác nhận & giữ hàng',
    state: confirmState,
    hint: 'Shop kiểm tra và trừ tồn để chuẩn bị giao.',
  };

  const stepShip: OrderFlowStep = {
    label: 'Giao hàng',
    state: shipState,
    hint: 'Đang vận chuyển hoặc sắp giao.',
  };

  const stepFinal: OrderFlowStep = {
    label: 'Hoàn tất',
    state: finalState,
    hint: 'Đã nhận hàng và đơn kết thúc.',
  };

  return [stepPlaced, stepConfirm, stepShip, stepFinal];
}

/** Khách được hủy khi shop chưa chuyển sang đang giao (chưa SHIPPED) và đơn chưa kết thúc. */
export function canCustomerCancelOrder(order: Order): boolean {
  if (isTerminalCancelled(order) || isFulfilmentDone(order)) return false;
  const s = (order.status || '').toUpperCase();
  if (s === 'SHIPPED') return false;
  const ps = (order.paymentStatus || '').toUpperCase();
  const method = (order.paymentMethod || '').toUpperCase();
  // Công nợ đã ghi nhận thanh toán: không cho tự hủy trên client
  if (ps === 'PAID' && method === 'NET_TERMS') return false;
  // VNPAY đã thu: cho hủy → mở luồng hoàn tiền có kiểm soát
  if (ps === 'PAID' && method === 'VNPAY') return s === 'PENDING' || s === 'PROCESSING';
  // CK/QR khác (mở rộng sau): tạm giữ như VNPAY nếu không phải COD/NET_TERMS
  if (ps === 'PAID' && method !== 'COD' && method !== 'NET_TERMS') return s === 'PENDING' || s === 'PROCESSING';
  return s === 'PENDING' || s === 'PROCESSING';
}

/** Khách xác nhận đã nhận hàng → hoàn tất giao. */
export function canCustomerMarkReceived(order: Order): boolean {
  if (isTerminalCancelled(order) || isFulfilmentDone(order)) return false;
  const s = (order.status || '').toUpperCase();
  return s === 'PROCESSING' || s === 'SHIPPED';
}
