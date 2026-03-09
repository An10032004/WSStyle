package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ProductVariantRequest;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.repository.ProductRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductVariantService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;

    /**
     * Lấy tất cả biến thể
     */
    @Transactional(readOnly = true)
    public List<ProductVariant> getAllVariants() {
        return productVariantRepository.findAll();
    }

    /**
     * Lấy biến thể theo ID
     */
    @Transactional(readOnly = true)
    public ProductVariant getVariantById(Integer id) {
        return productVariantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Biến thể sản phẩm", "id", id));
    }

    /**
     * Lấy biến thể theo sản phẩm
     */
    @Transactional(readOnly = true)
    public List<ProductVariant> getVariantsByProduct(Integer productId) {
        return productVariantRepository.findByProductId(productId);
    }

    /**
     * Tìm biến thể theo SKU
     */
    @Transactional(readOnly = true)
    public ProductVariant getVariantBySku(String sku) {
        return productVariantRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Biến thể sản phẩm", "sku", sku));
    }

    /**
     * Tạo biến thể mới
     */
    public ProductVariant createVariant(ProductVariantRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", request.getProductId()));

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(request.getSku())
                .attributes(request.getAttributes())
                .stockQuantity(request.getStockQuantity())
                .priceAdjustment(request.getPriceAdjustment())
                .imageUrl(request.getImageUrl())
                .build();

        return productVariantRepository.save(variant);
    }

    /**
     * Cập nhật biến thể
     */
    public ProductVariant updateVariant(Integer id, ProductVariantRequest request) {
        ProductVariant variant = getVariantById(id);

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", request.getProductId()));

        variant.setProduct(product);
        variant.setSku(request.getSku());
        variant.setAttributes(request.getAttributes());
        variant.setStockQuantity(request.getStockQuantity());
        variant.setPriceAdjustment(request.getPriceAdjustment());
        variant.setImageUrl(request.getImageUrl());

        return productVariantRepository.save(variant);
    }

    /**
     * Xóa biến thể
     */
    public void deleteVariant(Integer id) {
        ProductVariant variant = getVariantById(id);
        productVariantRepository.delete(variant);
    }
}
