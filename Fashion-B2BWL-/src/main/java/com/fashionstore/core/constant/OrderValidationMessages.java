package com.fashionstore.core.constant;

/**
 * Thông báo lỗi đặt hàng — đồng bộ kịch bản kiểm thử API POST /api/orders.
 */
public final class OrderValidationMessages {

    private OrderValidationMessages() {}

    public static final String MISSING_USER_INFO = "Thiếu thông tin người dùng";
    public static final String OVERDUE_DEBT = "Bạn có đơn công nợ quá hạn";
    public static final String INVALID_PHONE = "Số điện thoại không hợp lệ";
    public static final String EMPTY_ITEMS = "Đơn hàng phải có ít nhất 1 sản phẩm";
    public static final String QUANTITY_POSITIVE = "Số lượng phải lớn hơn 0";
    public static final String VARIANT_INACTIVE = "Biến thể đã ngừng bán, không thể đặt hàng.";
    public static final String PRODUCT_INACTIVE = "Sản phẩm đã ngừng hoạt động, không thể đặt hàng.";
}
