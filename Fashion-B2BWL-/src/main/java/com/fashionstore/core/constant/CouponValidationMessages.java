package com.fashionstore.core.constant;

/**
 * Thông báo validate CRUD coupon (admin) — đồng bộ với form coupons.
 */
public final class CouponValidationMessages {

    private CouponValidationMessages() {}

    public static final String CODE_REQUIRED = "Mã coupon không được để trống.";
    public static final String CODE_TOO_LONG = "Mã coupon tối đa 100 ký tự.";
    public static final String CODE_DUPLICATE = "Mã coupon này đã tồn tại.";

    public static final String DISCOUNT_TYPE_REQUIRED = "Loại giảm giá không hợp lệ.";
    public static final String DISCOUNT_VALUE_REQUIRED = "Giá trị giảm phải lớn hơn 0.";
    public static final String DISCOUNT_PERCENT_MAX = "Phần trăm giảm không được vượt quá 100.";

    public static final String STATUS_INVALID = "Trạng thái phải là ACTIVE hoặc INACTIVE.";

    public static final String DATE_RANGE_INVALID =
            "Thời gian bắt đầu phải trước hoặc bằng thời gian kết thúc.";

    public static final String MIN_PRIOR_ORDERS_NEGATIVE = "Số đơn tối thiểu không được âm.";
    public static final String PRIORITY_NEGATIVE = "Mức ưu tiên không được âm.";
}
