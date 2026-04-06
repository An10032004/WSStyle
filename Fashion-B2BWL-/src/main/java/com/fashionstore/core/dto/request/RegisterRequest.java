package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String fullName;
    private String phone;
    private String companyName;
    private String taxCode;
}
