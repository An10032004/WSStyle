package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.AiAssistantAdminContextRequest;
import com.fashionstore.core.dto.request.BulkVariantSearchTagsRequest;
import com.fashionstore.core.dto.response.AiAssistantAdminContextResponse;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.service.AiAssistantAdminContextService;
import com.fashionstore.core.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai-assistant")
@RequiredArgsConstructor
public class AdminAiAssistantController {

    private final AiAssistantAdminContextService aiAssistantAdminContextService;
    private final ProductVariantService productVariantService;

    @GetMapping("/contexts")
    public ResponseEntity<ApiResponse<List<AiAssistantAdminContextResponse>>> listContexts() {
        return ResponseEntity.ok(ApiResponse.success(aiAssistantAdminContextService.listAll()));
    }

    @GetMapping("/contexts/{id}")
    public ResponseEntity<ApiResponse<AiAssistantAdminContextResponse>> getContext(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(aiAssistantAdminContextService.getById(id)));
    }

    @PostMapping("/contexts")
    public ResponseEntity<ApiResponse<AiAssistantAdminContextResponse>> createContext(
            @Valid @RequestBody AiAssistantAdminContextRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đã tạo", aiAssistantAdminContextService.create(body)));
    }

    @PutMapping("/contexts/{id}")
    public ResponseEntity<ApiResponse<AiAssistantAdminContextResponse>> updateContext(
            @PathVariable Integer id, @Valid @RequestBody AiAssistantAdminContextRequest body) {
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật", aiAssistantAdminContextService.update(id, body)));
    }

    @DeleteMapping("/contexts/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContext(@PathVariable Integer id) {
        aiAssistantAdminContextService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa", null));
    }

    @PostMapping("/variants/bulk-search-tags")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> bulkVariantSearchTags(
            @Valid @RequestBody BulkVariantSearchTagsRequest body) {
        int n = productVariantService.bulkSetSearchTags(body.getVariantIds(), body.getSearchTags());
        return ResponseEntity.ok(ApiResponse.success(Map.of("updated", n)));
    }
}
