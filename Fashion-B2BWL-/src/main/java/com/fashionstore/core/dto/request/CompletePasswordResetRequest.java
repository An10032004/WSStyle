package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class CompletePasswordResetRequest {
    private String token;
    private String newPassword;
}
