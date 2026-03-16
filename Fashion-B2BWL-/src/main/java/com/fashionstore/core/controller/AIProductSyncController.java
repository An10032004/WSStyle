package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.AIProductSync;
import com.fashionstore.core.service.AIProductSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ai-sync")
@RequiredArgsConstructor
public class AIProductSyncController {

    private final AIProductSyncService syncService;

    @GetMapping("/status")
    public ApiResponse<List<AIProductSync>> getAllSyncStatus() {
        return ApiResponse.success(syncService.getAllSyncStatus());
    }

    @PostMapping("/sync/{productId}")
    public ApiResponse<AIProductSync> syncProduct(@PathVariable Integer productId) {
        return ApiResponse.success(syncService.syncProduct(productId));
    }
}
