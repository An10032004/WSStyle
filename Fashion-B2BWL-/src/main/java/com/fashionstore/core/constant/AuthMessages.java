package com.fashionstore.core.constant;

public final class AuthMessages {

    private AuthMessages() {}

    /** Dùng chung khi email trùng đăng ký hoặc tài khoản ngừng / không hợp lệ để đăng nhập. */
    public static final String INVALID_EMAIL = "Email không hợp lệ.";

    public static final String INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng.";

    public static final String INVALID_REFRESH_SESSION = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.";
}
