package com.fashionstore.core.constant;

/**
 * Thông báo đồng bộ với {@code FE-Fashion-B2BWL}: đăng ký, đại lý, địa chỉ, đặt lại mật khẩu.
 */
public final class StorefrontValidationMessages {

    private StorefrontValidationMessages() {}

    // ─── Đăng ký (register.html / register.ts) ─────────────────────────────
    public static final String REGISTER_MISSING_BODY = "Thiếu dữ liệu đăng ký.";
    public static final String REGISTER_EMAIL_REQUIRED = "Email không được để trống.";
    public static final String REGISTER_EMAIL_FORMAT = "Định dạng email chưa đúng.";
    public static final String REGISTER_FULL_NAME_REQUIRED = "Họ và tên không được để trống.";
    public static final String REGISTER_PASSWORD_REQUIRED = "Mật khẩu không được để trống.";
    public static final String REGISTER_PASSWORD_MIN_LENGTH = "Mật khẩu tối thiểu 6 ký tự.";
    public static final String REGISTER_PASSWORD_WEAK = "Mật khẩu bảo mật kém.";
    public static final String REGISTER_PHONE_REQUIRED = "SĐT không được để trống.";
    public static final String REGISTER_PHONE_FORMAT = "SĐT phải có 10 chữ số và bắt đầu bằng số 0.";
    public static final String REGISTER_PHONE_DUPLICATE = "SĐT đã được sử dụng.";

    // ─── Đăng ký đại lý (b2b-register.html / b2b-register.ts) ────────────────
    public static final String B2B_MISSING_PAYLOAD = "Thiếu payload đăng ký đại lý.";
    public static final String B2B_MISSING_USER_ID = "Thiếu userId.";
    public static final String B2B_FORM_INVALID_JSON = "Dữ liệu form không hợp lệ.";
    public static final String B2B_COMPANY_REQUIRED = "Tên doanh nghiệp không được để trống.";
    public static final String B2B_COMPANY_MIN_LENGTH = "Tên doanh nghiệp phải có ít nhất 2 ký tự.";
    public static final String B2B_COMPANY_MAX_LENGTH = "Tên doanh nghiệp tối đa 255 ký tự.";
    public static final String B2B_TAX_REQUIRED = "Mã số thuế không được để trống.";
    public static final String B2B_TAX_FORMAT = "Chỉ được nhập chữ số (và dấu - giữa phần mở rộng nếu có).";
    public static final String B2B_TAX_LENGTH = "Mã số thuế phải gồm đúng 10 hoặc 13 chữ số (có thể thêm 3 số chi nhánh).";
    public static final String B2B_ADDRESS_REQUIRED = "Địa chỉ kinh doanh không được để trống.";
    public static final String B2B_ADDRESS_MIN_LENGTH = "Địa chỉ kinh doanh phải có ít nhất 5 ký tự.";
    public static final String B2B_ADDRESS_MAX_LENGTH = "Địa chỉ kinh doanh tối đa 500 ký tự.";
    public static final String B2B_BUSINESS_TYPE_REQUIRED = "Loại hình kinh doanh không được để trống.";
    public static final String B2B_BUSINESS_TYPE_MIN_LENGTH = "Loại hình kinh doanh phải có ít nhất 2 ký tự.";
    public static final String B2B_BUSINESS_TYPE_MAX_LENGTH = "Loại hình kinh doanh tối đa 200 ký tự.";
    public static final String B2B_DESCRIPTION_MAX_LENGTH = "Tối đa 2000 ký tự.";

    public static final String B2B_UPDATE_MISSING_PAYLOAD = "Thiếu payload cập nhật hồ sơ.";

    // ─── Địa chỉ giao hàng (vn-address-form + profile) ─────────────────────
    public static final String SHIPPING_ADDRESS_INCOMPLETE =
            "Vui lòng chọn đủ tỉnh/thành, quận/huyện, phường/xã và nhập số nhà, đường.";
    public static final String SHIPPING_ADDRESS_JSON_INVALID = "Địa chỉ không hợp lệ. Vui lòng nhập lại.";
    public static final String SHIPPING_ADDRESS_DETAIL_MAX = "Địa chỉ chi tiết không quá 500 ký tự.";

    // ─── Đặt lại mật khẩu (reset-password + PasswordResetService) ───────────
    public static final String RESET_PASSWORD_MIN_LENGTH = "Mật khẩu tối thiểu 6 ký tự.";
    public static final String RESET_LINK_INVALID = "Liên kết không hợp lệ hoặc đã hết hạn.";
    public static final String RESET_ACCOUNT_BLOCKED = "Tài khoản không thể đặt lại mật khẩu.";
}
