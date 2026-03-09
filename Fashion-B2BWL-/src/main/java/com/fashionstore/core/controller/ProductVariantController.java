package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ProductVariantRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-variants")
@RequiredArgsConstructor
public class ProductVariantController {

    private final ProductVariantService productVariantService;

    /**
     * GET /api/product-variants — Lấy tất cả biến thể
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductVariant>>> getAllVariants() {
        List<ProductVariant> variants = productVariantService.getAllVariants();
        return ResponseEntity.ok(ApiResponse.success(variants));
    }

    /**
     * GET /api/product-variants/{id} — Lấy biến thể theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductVariant>> getVariantById(@PathVariable("id") Integer id) {
        ProductVariant variant = productVariantService.getVariantById(id);
        return ResponseEntity.ok(ApiResponse.success(variant));
    }

    /**
     * GET /api/product-variants/product/{productId} — Lấy biến thể theo sản phẩm
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<ProductVariant>>> getVariantsByProduct(
            @PathVariable("productId") Integer productId) {
        List<ProductVariant> variants = productVariantService.getVariantsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(variants));
    }

    /**
     * GET /api/product-variants/sku/{sku} — Tìm biến thể theo SKU
     */
    @GetMapping("/sku/{sku}")
    public ResponseEntity<ApiResponse<ProductVariant>> getVariantBySku(@PathVariable("sku") String sku) {
        ProductVariant variant = productVariantService.getVariantBySku(sku);
        return ResponseEntity.ok(ApiResponse.success(variant));
    }

    /**
     * POST /api/product-variants — Tạo biến thể mới
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ProductVariant>> createVariant(
            @Valid @RequestBody ProductVariantRequest request) {
        ProductVariant created = productVariantService.createVariant(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo biến thể thành công", created));
    }

    /**
     * PUT /api/product-variants/{id} — Cập nhật biến thể
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductVariant>> updateVariant(
            @PathVariable("id") Integer id,
            @Valid @RequestBody ProductVariantRequest request) {
        ProductVariant updated = productVariantService.updateVariant(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật biến thể thành công", updated));
    }

    /**
     * DELETE /api/product-variants/{id} — Xóa biến thể
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVariant(@PathVariable("id") Integer id) {
        productVariantService.deleteVariant(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa biến thể thành công", null));
    }
}
