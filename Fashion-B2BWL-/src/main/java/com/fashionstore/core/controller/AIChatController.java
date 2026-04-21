package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.AIResponse;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.AssistantSessionItemDTO;
import com.fashionstore.core.dto.response.AssistantTurnDTO;
import com.fashionstore.core.service.AIProductHelperService;
import com.fashionstore.core.service.LuxeAssistantHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cross-origin for testing
public class AIChatController {

    private final AIProductHelperService aiService;
    private final LuxeAssistantHistoryService assistantHistoryService;

    @GetMapping("/sessions")
    public ApiResponse<List<AssistantSessionItemDTO>> listSessions(
            @RequestParam("userId") Integer userId,
            @RequestParam(value = "limit", defaultValue = "30") int limit) {
        if (userId == null) {
            return ApiResponse.<List<AssistantSessionItemDTO>>builder()
                    .success(false)
                    .message("Thiếu userId.")
                    .build();
        }
        return ApiResponse.<List<AssistantSessionItemDTO>>builder()
                .success(true)
                .data(assistantHistoryService.listSessions(userId, limit))
                .build();
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ApiResponse<List<AssistantTurnDTO>> sessionMessages(
            @PathVariable("sessionId") Long sessionId, @RequestParam("userId") Integer userId) {
        if (userId == null) {
            return ApiResponse.<List<AssistantTurnDTO>>builder()
                    .success(false)
                    .message("Thiếu userId.")
                    .build();
        }
        return ApiResponse.<List<AssistantTurnDTO>>builder()
                .success(true)
                .data(assistantHistoryService.listTurns(sessionId, userId))
                .build();
    }

    @PostMapping("/chat")
    public ApiResponse<AIResponse> chat(@RequestBody Map<String, Object> request) {
        try {
            String message = stringField(request, "message");
            if (message == null || message.trim().isEmpty()) {
                return ApiResponse.<AIResponse>builder()
                        .success(false)
                        .message("Tin nhắn không được để trống.")
                        .build();
            }

            Integer userId = intField(request, "userId");
            String storefrontContext = stringField(request, "storefrontContext");
            Long sessionIdIn = longField(request, "sessionId");

            AIResponse response = aiService.chat(message.trim(), userId, storefrontContext);

            if (userId != null) {
                Long sid = assistantHistoryService.recordExchange(sessionIdIn, userId, message.trim(), response);
                response.setSessionId(sid);
            }

            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(response)
                    .build();
        } catch (Exception e) {
            System.err.println("Lỗi AI Assistant: " + e.getMessage());
            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(new AIResponse(
                            "Hiện không xử lý được yêu cầu. Vui lòng thử lại sau.",
                            List.of()))
                    .build();
        }
    }

    /**
     * Tìm kiếm ngữ nghĩa qua cùng pipeline AI (Gemini → JSON → truy vấn DB).
     * Body: {@code { "query": "..." }} hoặc {@code { "message": "..." }}; tùy chọn {@code userId}, {@code storefrontContext}.
     */
    @PostMapping("/search")
    public ApiResponse<AIResponse> search(@RequestBody Map<String, Object> request) {
        String raw = stringField(request, "query");
        if (raw == null || raw.isBlank()) {
            raw = stringField(request, "message");
        }
        if (raw == null || raw.trim().isEmpty()) {
            return ApiResponse.<AIResponse>builder()
                    .success(false)
                    .message("Tham số query/message không được để trống.")
                    .build();
        }
        String msg = "[Tìm kiếm cửa hàng] " + raw.trim();
        try {
            Integer userId = intField(request, "userId");
            String storefrontContext = stringField(request, "storefrontContext");
            Long sessionIdIn = longField(request, "sessionId");
            AIResponse response = aiService.chat(msg, userId, storefrontContext);
            if (userId != null) {
                Long sid = assistantHistoryService.recordExchange(sessionIdIn, userId, msg, response);
                response.setSessionId(sid);
            }
            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(response)
                    .build();
        } catch (Exception e) {
            System.err.println("Lỗi AI Search: " + e.getMessage());
            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(new AIResponse("Không thể thực hiện tìm kiếm AI lúc này.", List.of()))
                    .build();
        }
    }

    private static String stringField(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) {
            return null;
        }
        return v.toString().trim();
    }

    private static Integer intField(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Long longField(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
