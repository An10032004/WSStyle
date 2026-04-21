package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gửi email qua <a href="https://resend.com">Resend</a> (HTTP API, không cần SMTP).
 * Cấu hình: {@code app.mail.resend.api-key}, {@code app.mail.resend.from} (vd {@code onboarding@resend.dev} khi test).
 */
@Component
@Slf4j
public class ResendEmailSender {

    private static final String RESEND_URL = "https://api.resend.com/emails";

    /** Không inject bean {@code ObjectMapper} — Spring Boot 4 có thể không đăng ký bean này. */
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${app.mail.resend.api-key:}")
    private String apiKey;

    @Value("${app.mail.resend.from:}")
    private String fromEmail;

    @Value("${app.mail.from-name:WSSTYLE}")
    private String fromName;

    /** {@code true} nếu đã gửi qua API; {@code false} nếu thiếu cấu hình hoặc lỗi (đã log). */
    public boolean sendPlainText(String to, String subject, String textBody) {
        if (to == null || to.isBlank()) {
            return false;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Chưa đặt app.mail.resend.api-key — không gửi được email qua Resend.");
            return false;
        }
        String from = fromEmail == null ? "" : fromEmail.trim();
        if (!from.contains("@")) {
            log.warn("app.mail.resend.from phải là email đầy đủ (vd onboarding@resend.dev).");
            return false;
        }
        String safeName = (fromName == null ? "WSSTYLE" : fromName).replace("\"", "'").replace('<', ' ').replace('>', ' ');
        String fromHeader = "%s <%s>".formatted(safeName.trim(), from);
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("from", fromHeader);
            payload.put("to", to.trim());
            payload.put("subject", subject);
            payload.put("text", textBody);

            RestClient.create()
                    .post()
                    .uri(RESEND_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .body(JSON.writeValueAsString(payload))
                    .retrieve()
                    .body(String.class);
            log.info("Resend: đã gửi tới {}", to);
            return true;
        } catch (RestClientResponseException e) {
            log.error("Resend HTTP {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("Resend lỗi: {} — {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }
}
