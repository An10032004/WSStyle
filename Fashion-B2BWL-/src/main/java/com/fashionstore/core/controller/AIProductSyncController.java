package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.AIProductSync;
import com.fashionstore.core.service.AIProductSyncService;
import com.fashionstore.core.service.AiSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ai-sync")
@RequiredArgsConstructor
public class AIProductSyncController {

    private final AIProductSyncService syncService;
    private final AiSyncService aiSyncService; // Thêm service viết mô tả

    @GetMapping("/status")
    public ApiResponse<List<AIProductSync>> getAllSyncStatus() {
        return ApiResponse.success(syncService.getAllSyncStatus());
    }

    @PostMapping("/sync/{productId}")
    public ApiResponse<AIProductSync> syncProduct(@PathVariable Integer productId) {
        return ApiResponse.success(syncService.syncProduct(productId));
    }

    @PostMapping("/generate-descriptions")
    public ApiResponse<String> generateDescriptions() {
        aiSyncService.generateDescriptionsForEmptyEntries();
        return ApiResponse.success("Đã bắt đầu tiến trình viết mô tả AI cho các sản phẩm còn trống.");
    }
}
