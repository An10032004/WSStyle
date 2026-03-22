package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.CategoryRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.CategoryResponse;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * GET /api/categories — Lấy tất cả danh mục
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        List<CategoryResponse> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    /**
     * GET /api/categories/root — Lấy danh mục gốc (không có parent)
     */
    @GetMapping("/root")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getRootCategories() {
        List<CategoryResponse> rootCategories = categoryService.getRootCategories();
        return ResponseEntity.ok(ApiResponse.success(rootCategories));
    }

    /**
     * GET /api/categories/{id} — Lấy 1 danh mục theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable("id") Integer id) {
        // NOTE: CategoryService.getCategoryById returns Entity. 
        // We should probably map it here or update Service to return Response.
        // I updated Service to use mapToResponse in create/update/getAll, 
        // but let's check getCategoryById in Service.
        Category category = categoryService.getCategoryById(id);
        CategoryResponse response = CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .build();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * POST /api/categories — Tạo danh mục mới
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = categoryService.createCategory(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục thành công", created));
    }

    /**
     * PUT /api/categories/{id} — Cập nhật danh mục
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable("id") Integer id,
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse updated = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công", updated));
    }

    /**
     * DELETE /api/categories/{id} — Xóa danh mục
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable("id") Integer id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục thành công", null));
    }
}
