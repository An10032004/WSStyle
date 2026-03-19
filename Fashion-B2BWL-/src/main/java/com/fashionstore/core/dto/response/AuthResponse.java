package com.fashionstore.core.dto.response;

import com.fashionstore.core.model.User;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private boolean success;
    private String message;
    private User user;
    private String token; // For future JWT support, currently just a placeholder
}
