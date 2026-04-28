package com.fashionstore.core.constant;

/**
 * Quản lý nhân viên (màn /staff) — thông báo khi {@link com.fashionstore.core.dto.request.UserRequest#staffModule} bật.
 */
public final class AdminStaffValidationMessages {

    private AdminStaffValidationMessages() {}

    public static final String FULL_NAME_REQUIRED = "Họ và tên không được để trống.";

    public static final String PASSWORD_REQUIRED = "Mật khẩu không được để trống (tối thiểu 6 ký tự).";

    public static final String PRIMARY_ROLE_STAFF_ONLY =
            "Vai trò tài khoản chỉ được là Quản trị (ADMIN) hoặc Nhân viên (STAFF).";

    public static final String ASSIGNED_ROLE_REQUIRED =
            "Phải chọn quyền hệ thống (gán quyền) cho nhân viên.";
}
