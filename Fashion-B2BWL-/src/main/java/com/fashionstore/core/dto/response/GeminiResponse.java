package com.fashionstore.core.dto.response;

import java.util.List;

// --- DTO cho dữ liệu nhận VỀ (Response) ---
public class GeminiResponse {
    private List<Candidate> candidates;

    // Lấy nội dung văn bản đầu tiên mà AI sinh ra
    public String getGeneratedText() {
        if (candidates != null && !candidates.isEmpty()) {
            return candidates.get(0).content.parts.get(0).text;
        }
        return null;
    }

    // Cấu trúc mặc định của Gemini để bóc tách JSON
    public static class Candidate {
        public ContentResponse content;
    }

    public static class ContentResponse {
        public List<PartResponse> parts;
    }

    public static class PartResponse {
        public String text;
    }

    public List<Candidate> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<Candidate> c) {
        this.candidates = c;
    }
}