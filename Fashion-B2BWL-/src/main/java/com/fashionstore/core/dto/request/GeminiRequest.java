package com.fashionstore.core.dto.request;

import java.util.List;

// --- DTO cho dữ liệu gửi ĐI (Request) ---
public class GeminiRequest {
    private List<Content> contents;

    public GeminiRequest(String prompt) {
        // Cấu trúc mặc định của Gemini: contents -> parts -> text
        this.contents = List.of(new Content(List.of(new Part(prompt))));
    }

    // Getters/Setters lồng nhau
    public static class Content {
        public List<Part> parts;

        public Content(List<Part> p) {
            this.parts = p;
        }
    }

    public static class Part {
        public String text;

        public Part(String t) {
            this.text = t;
        }
    }

    public List<Content> getContents() {
        return contents;
    }
}