package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ProductRequest;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.repository.CategoryRepository;
import com.fashionstore.core.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.fashionstore.core.repository.specification.ProductSpecification;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Lấy tất cả sản phẩm
     */
    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    /**
     * Lấy sản phẩm theo ID
     */
    @Transactional(readOnly = true)
    public Product getProductById(Integer id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", id));
    }

    /**
     * Lấy sản phẩm theo danh mục
     */
    @Transactional(readOnly = true)
    public List<Product> getProductsByCategory(Integer categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }

    /**
     * Lấy sản phẩm có phân trang và lọc (Server-side Pagination & Filtering)
     */
    @Transactional(readOnly = true)
    public Page<Product> getProductsPaged(String search, List<Integer> categoryIds, BigDecimal minPrice, BigDecimal maxPrice, List<String> brands, Pageable pageable) {
        return productRepository.findAll(ProductSpecification.filterProducts(search, categoryIds, minPrice, maxPrice, brands), pageable);
    }

    /**
     * Lấy danh sách thương hiệu hiện có
     */
    @Transactional(readOnly = true)
    public List<String> getAvailableBrands() {
        return productRepository.findDistinctBrands();
    }

    /**
     * Tìm sản phẩm theo mã sản phẩm
     */
    @Transactional(readOnly = true)
    public Product getProductByCode(String productCode) {
        return productRepository.findByProductCode(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "productCode", productCode));
    }

    /**
     * Tạo sản phẩm mới
     */
    public Product createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", request.getCategoryId()));

        Product product = Product.builder()
                .category(category)
                .productCode(request.getProductCode())
                .name(request.getName())
                .basePrice(request.getBasePrice())
                .material(request.getMaterial())
                .origin(request.getOrigin())
                .brand(request.getBrand())
                .imageUrl(request.getImageUrl())
                .imageUrls(request.getImageUrls())
                .shopId(1)
                .build();

        return productRepository.save(product);
    }

    /**
     * Cập nhật sản phẩm
     */
    public Product updateProduct(Integer id, ProductRequest request) {
        Product product = getProductById(id);

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", request.getCategoryId()));

        product.setCategory(category);
        product.setProductCode(request.getProductCode());
        product.setName(request.getName());
        product.setBasePrice(request.getBasePrice());
        product.setMaterial(request.getMaterial());
        product.setOrigin(request.getOrigin());
        product.setBrand(request.getBrand());
        product.setImageUrl(request.getImageUrl());
        product.setImageUrls(request.getImageUrls());

        return productRepository.save(product);
    }

    /**
     * Xóa sản phẩm
     */
    public void deleteProduct(Integer id) {
        Product product = getProductById(id);
        productRepository.delete(product);
    }
}
