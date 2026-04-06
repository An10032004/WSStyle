package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ProductRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.ProductMapperService;
import com.fashionstore.core.service.ProductService;
import com.fashionstore.core.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductMapperService productMapperService;
    private final UserService userService;

    /**
     * GET /api/products — Lấy tất cả sản phẩm
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponseDTO>>> getAllProducts(
            @RequestParam(required = false) Integer userId) {
        User user = (userId != null) ? userService.getUserById(userId) : null;
        List<Product> products = productService.getAllProducts();
        List<ProductResponseDTO> dtos = productMapperService.toDTOs(products, user);
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    /**
     * GET /api/products/search — Tìm kiếm, lọc và phân trang sản phẩm
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<ProductResponseDTO>>> searchProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Integer> categoryIds,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) List<String> brands,
            @RequestParam(defaultValue = "newest") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestParam(required = false) Integer userId
    ) {
        User user = (userId != null) ? userService.getUserById(userId) : null;
        
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        if ("price-asc".equals(sortBy)) {
            sort = Sort.by(Sort.Direction.ASC, "basePrice");
        } else if ("price-desc".equals(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "basePrice");
        }
        
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Product> productsPage = productService.getProductsPaged(search, categoryIds, minPrice, maxPrice, brands, pageable);
        Page<ProductResponseDTO> dtosPage = productMapperService.toDTOs(productsPage, user);
        
        return ResponseEntity.ok(ApiResponse.success(dtosPage));
    }

    /**
     * GET /api/products/brands — Lấy danh sách thương hiệu
     */
    @GetMapping("/brands")
    public ResponseEntity<ApiResponse<List<String>>> getBrands() {
        return ResponseEntity.ok(ApiResponse.success(productService.getAvailableBrands()));
    }

    /**
     * GET /api/products/{id} — Lấy sản phẩm theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponseDTO>> getProductById(
            @PathVariable("id") Integer id,
            @RequestParam(required = false) Integer userId) {
        User user = (userId != null) ? userService.getUserById(userId) : null;
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success(productMapperService.toDTO(product, user)));
    }

    /**
     * GET /api/products/category/{categoryId} — Lấy sản phẩm theo danh mục
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductResponseDTO>>> getProductsByCategory(
            @PathVariable("categoryId") Integer categoryId,
            @RequestParam(required = false) Integer userId) {
        User user = (userId != null) ? userService.getUserById(userId) : null;
        List<Product> products = productService.getProductsByCategory(categoryId);
        List<ProductResponseDTO> dtos = productMapperService.toDTOs(products, user);
        return ResponseEntity.ok(ApiResponse.success(dtos));
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
