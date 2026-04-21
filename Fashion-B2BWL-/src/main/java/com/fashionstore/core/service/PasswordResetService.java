package com.fashionstore.core.service;

import com.fashionstore.core.model.PasswordResetToken;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.PasswordResetTokenRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResendEmailSender resendEmailSender;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Value("${app.mail.from-name:WSSTYLE}")
    private String mailFromName;

    /**
     * Luôn thành công ở API (không tiết lộ email có tồn tại hay không).
     */
    @Transactional
    public void requestReset(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            return;
        }
        String email = rawEmail.trim();
        Optional<User> opt = userRepository.findByEmailIgnoreCase(email);
        if (opt.isEmpty()) {
            log.debug("Forgot password: không có user {}", email);
            return;
        }
        User user = opt.get();
        if (!user.isLoginAllowed()) {
            log.debug("Forgot password: login không cho phép {}", email);
            return;
        }

        tokenRepository.deleteByUserId(user.getId());

        String token = newTokenString();
        tokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(Instant.now().plus(60, ChronoUnit.MINUTES))
                .build());

        String base = frontendBaseUrl.replaceAll("/+$", "");
        String resetUrl = base + "/reset-password?token=" + token;
        String subject = mailFromName + " — Đặt lại mật khẩu";
        String body = "Xin chào,\n\n"
                + "Nhấn liên kết sau để đặt lại mật khẩu (hiệu lực 60 phút):\n\n"
                + resetUrl
                + "\n\n"
                + "Nếu bạn không yêu cầu, hãy bỏ qua email này.\n";

        boolean sent = resendEmailSender.sendPlainText(user.getEmail(), subject, body);
        if (!sent) {
            log.warn("[Dev] Link đặt lại mật khẩu (Resend chưa gửi được): {}", resetUrl);
        }
    }

    private static String newTokenString() {
        byte[] buf = new byte[48];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    @Transactional
    public void completeReset(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new RuntimeException("Token không hợp lệ");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Mật khẩu mới cần ít nhất 6 ký tự");
        }
        PasswordResetToken row = tokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new RuntimeException("Liên kết không hợp lệ hoặc đã hết hạn"));
        if (!row.isUsable()) {
            throw new RuntimeException("Liên kết không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(row.getUserId())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));
        if (!user.isLoginAllowed()) {
            throw new RuntimeException("Tài khoản không thể đặt lại mật khẩu");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        row.setUsedAt(Instant.now());
        tokenRepository.save(row);
    }
}
