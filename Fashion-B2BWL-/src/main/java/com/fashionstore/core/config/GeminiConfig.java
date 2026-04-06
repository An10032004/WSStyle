package com.fashionstore.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class GeminiConfig {

    @Value("${google.ai.api-key}")
    private String apiKey;

    @Value("${google.ai.url}")
    private String apiUrl;

    @Bean
    public WebClient geminiClient() {
        return WebClient.builder()
                .baseUrl(apiUrl)
                // Gemini yêu cầu truyền API Key qua query parameter key
                .defaultUriVariables(java.util.Map.of("key", apiKey))
                .build();
    }
}