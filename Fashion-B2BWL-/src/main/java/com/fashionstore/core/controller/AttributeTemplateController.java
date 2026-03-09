package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.AttributeTemplateRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.AttributeTemplate;
import com.fashionstore.core.service.AttributeTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attribute-templates")
@RequiredArgsConstructor
public class AttributeTemplateController {

    private final AttributeTemplateService attributeTemplateService;

    /**
     * GET /api/attribute-templates — Lấy tất cả attribute templates
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<AttributeTemplate>>> getAllAttributeTemplates() {
        List<AttributeTemplate> templates = attributeTemplateService.getAllAttributeTemplates();
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    /**
     * GET /api/attribute-templates/{id} — Lấy theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AttributeTemplate>> getAttributeTemplateById(
            @PathVariable("id") Integer id) {
        AttributeTemplate template = attributeTemplateService.getAttributeTemplateById(id);
        return ResponseEntity.ok(ApiResponse.success(template));
    }

    /**
     * GET /api/attribute-templates/category/{categoryId} — Lấy theo category
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<AttributeTemplate>>> getByCategory(
            @PathVariable("categoryId") Integer categoryId) {
        List<AttributeTemplate> templates = attributeTemplateService.getByCategory(categoryId);
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    /**
     * POST /api/attribute-templates — Tạo mới
     */
    @PostMapping
    public ResponseEntity<ApiResponse<AttributeTemplate>> createAttributeTemplate(
            @Valid @RequestBody AttributeTemplateRequest request) {
        AttributeTemplate created = attributeTemplateService.createAttributeTemplate(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo attribute template thành công", created));
    }

    /**
     * PUT /api/attribute-templates/{id} — Cập nhật
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AttributeTemplate>> updateAttributeTemplate(
            @PathVariable("id") Integer id,
            @Valid @RequestBody AttributeTemplateRequest request) {
        AttributeTemplate updated = attributeTemplateService.updateAttributeTemplate(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật attribute template thành công", updated));
    }

    /**
     * DELETE /api/attribute-templates/{id} — Xóa
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAttributeTemplate(@PathVariable("id") Integer id) {
        attributeTemplateService.deleteAttributeTemplate(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa attribute template thành công", null));
    }
}
