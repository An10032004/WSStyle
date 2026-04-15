package com.fashionstore.core.exception;

import com.fashionstore.core.constant.AuthMessages;

/**
 * Đăng ký: email đã tồn tại — trả về thông điệp chung {@link AuthMessages#INVALID_EMAIL}.
 */
public class InvalidEmailException extends RuntimeException {

    public InvalidEmailException() {
        super(AuthMessages.INVALID_EMAIL);
    }
}
