package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ProductRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * GET /api/products — Lấy tất cả sản phẩm
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Product>>> getAllProducts() {
        List<Product> products = productService.getAllProducts();
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    /**
     * GET /api/products/{id} — Lấy sản phẩm theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Product>> getProductById(@PathVariable("id") Integer id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    /**
     * GET /api/products/category/{categoryId} — Lấy sản phẩm theo danh mục
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<Product>>> getProductsByCategory(
            @PathVariable("categoryId") Integer categoryId) {
        List<Product> products = productService.getProductsByCategory(categoryId);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    /**
     * GET /api/products/code/{productCode} — Tìm sản phẩm theo mã
     */
    @GetMapping("/code/{productCode}")
    public ResponseEntity<ApiResponse<Product>> getProductByCode(
            @PathVariable("productCode") String productCode) {
        Product product = productService.getProductByCode(productCode);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    /**
     * POST /api/products — Tạo sản phẩm mới
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Product>> createProduct(
            @Valid @RequestBody ProductRequest request) {
        Product created = productService.createProduct(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sản phẩm thành công", created));
    }

    /**
     * PUT /api/products/{id} — Cập nhật sản phẩm
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Product>> updateProduct(
            @PathVariable("id") Integer id,
            @Valid @RequestBody ProductRequest request) {
        Product updated = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sản phẩm thành công", updated));
    }

    /**
     * DELETE /api/products/{id} — Xóa sản phẩm
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable("id") Integer id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa sản phẩm thành công", null));
    }
}
