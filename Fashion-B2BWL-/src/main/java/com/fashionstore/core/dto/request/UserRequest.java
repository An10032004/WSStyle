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
}
