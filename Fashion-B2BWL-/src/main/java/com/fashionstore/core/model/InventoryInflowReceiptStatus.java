package com.fashionstore.core.model;

/**
 * Trạng thái phiếu nhập kho: nháp → (hủy) hoặc đã nhập kho (cộng tồn + ghi chi phí).
 */
public enum InventoryInflowReceiptStatus {
    DRAFT,
    POSTED,
    CANCELLED
}
