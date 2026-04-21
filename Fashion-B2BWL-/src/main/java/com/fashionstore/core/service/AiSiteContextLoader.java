package com.fashionstore.core.service;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Tải nội dung định hướng UX/web cho prompt AI (RAG kiểu “tài liệu nguồn”, không phải vector DB).
 */
@Component
@Slf4j
public class AiSiteContextLoader {

    @Getter
    private String siteMarkdown = "";

    @PostConstruct
    public void load() {
        try {
            var res = new ClassPathResource("ai/site-context.md");
            if (!res.exists()) {
                siteMarkdown = "";
                return;
            }
            siteMarkdown = new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            log.info("AI site-context loaded: {} chars", siteMarkdown.length());
        } catch (Exception e) {
            log.warn("Could not load ai/site-context.md: {}", e.getMessage());
            siteMarkdown = "";
        }
    }
}
