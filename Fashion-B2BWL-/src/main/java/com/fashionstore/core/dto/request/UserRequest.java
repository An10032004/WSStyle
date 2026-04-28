package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class UserRequest {
    private String email;
    private String password;
    private String fullName;
    private String phone;
    private String role;
    private Integer customerGroupId;
    private String tags;
    private String registrationStatus;
    private String companyName;
    private String taxCode;
    /** ACTIVE | SUSPENDED — quản trị tạm ngừng tài khoản */
    private String accountStatus;

    /**
     * Nếu {@code true}: áp dụng quy tắc màn Quản lý nhân viên (FE /staff) —
     * họ tên, mật khẩu (khi tạo), quyền gán (assignedRole trong {@code tags}), vai trò ADMIN|STAFF.
     */
    private Boolean staffModule;
}
