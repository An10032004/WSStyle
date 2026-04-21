package com.fashionstore.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class GeminiConfig {

    /**
     * Auth theo hướng dẫn Google: header {@code x-goog-api-key} (hỗ trợ key có dấu chấm, ví dụ {@code AQ.xxx}).
     * URL đầy đủ tới {@code :generateContent} nằm ở {@code google.ai.url} — dùng trong {@link com.fashionstore.core.service.AiSyncService}.
     */
    @Bean
    public WebClient geminiClient(@Value("${google.ai.api-key:}") String apiKey) {
        WebClient.Builder builder = WebClient.builder();
        if (apiKey != null && !apiKey.isBlank()) {
            builder = builder.defaultHeader("x-goog-api-key", apiKey.trim());
        }
        return builder.build();
    }
}