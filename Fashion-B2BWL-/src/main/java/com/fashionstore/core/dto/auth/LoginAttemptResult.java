package com.fashionstore.core.dto.auth;

import com.fashionstore.core.model.User;

/**
 * Kết quả xác thực đăng nhập: thành công, sai mật khẩu/email, hoặc tài khoản không được phép đăng nhập.
 */
public record LoginAttemptResult(User user, boolean emailNotAllowed, boolean wrongCredentials) {

    public static LoginAttemptResult success(User user) {
        return new LoginAttemptResult(user, false, false);
    }

    public static LoginAttemptResult invalidEmail() {
        return new LoginAttemptResult(null, true, false);
    }

    public static LoginAttemptResult invalidCredentials() {
        return new LoginAttemptResult(null, false, true);
    }

    public boolean isSuccess() {
        return user != null;
    }
}
