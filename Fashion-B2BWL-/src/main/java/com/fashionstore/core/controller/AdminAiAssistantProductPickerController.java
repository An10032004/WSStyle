package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.AiAssistantProductPickerResponse;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.service.AiAssistantAdminProductPickerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tách riêng khỏi {@link AdminAiAssistantController} để đảm bảo Spring MVC đăng ký GET ổn định (tránh 404 kiểu
 * "No static resource …" khi mapping nằm cùng bean đã hot-reload).
 */
@RestController
@RequestMapping("/api/admin/ai-assistant/products-for-bulk-tags")
@RequiredArgsConstructor
public class AdminAiAssistantProductPickerController {

    private final AiAssistantAdminProductPickerService aiAssistantAdminProductPickerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AiAssistantProductPickerResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "newest") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);
        Page<AiAssistantProductPickerResponse> out =
                aiAssistantAdminProductPickerService.searchProductsWithVariants(search, sortBy, safePage, safeSize);
        return ResponseEntity.ok(ApiResponse.success(out));
    }
}
