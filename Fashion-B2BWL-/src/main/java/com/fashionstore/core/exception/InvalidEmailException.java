package com.fashionstore.core.exception;

import com.fashionstore.core.constant.AuthMessages;

/**
 * Đăng ký: email đã tồn tại — trả về thông điệp chung {@link AuthMessages#INVALID_EMAIL}.
 */
public class InvalidEmailException extends RuntimeException {

    public InvalidEmailException() {
        super(AuthMessages.INVALID_EMAIL);
    }

    /** Ví dụ: email trống / sai định dạng — đồng bộ văn bản với form đăng ký client. */
    public InvalidEmailException(String message) {
        super(message != null && !message.isBlank() ? message : AuthMessages.INVALID_EMAIL);
    }
}
