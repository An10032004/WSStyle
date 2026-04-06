package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.AIResponse;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.service.AIProductHelperService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cross-origin for testing
public class AIChatController {

    private final AIProductHelperService aiService;

    @PostMapping("/chat")
    public ApiResponse<AIResponse> chat(@RequestBody Map<String, String> request) {
        try {
            String message = request.get("message");
            if (message == null || message.trim().isEmpty()) {
                return ApiResponse.<AIResponse>builder()
                        .success(false)
                        .message("Tin nhắn không được để trống.")
                        .build();
            }

            AIResponse response = aiService.chat(message);
            
            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(response)
                    .build();
        } catch (Exception e) {
            // Log chi tiết lỗi
            System.err.println("Lỗi AI Assistant: " + e.getMessage());
            return ApiResponse.<AIResponse>builder()
                    .success(true)
                    .data(new AIResponse("Chào bạn! Hiện tại tôi đang cập nhật một chút dữ liệu kho hàng, nhưng tôi vẫn có thể hỗ trợ bạn. Bạn quan tâm mẫu trang sức hay quần áo nào ạ?", null))
                    .build();
        }
    }
}
