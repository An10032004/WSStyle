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
                .stockQuantity(request.getStockQuantity())
                .priceAdjustment(request.getPriceAdjustment())
                .imageUrl(request.getImageUrl())
                .color(request.getColor())
                .size(request.getSize())
                .weight(request.getWeight())
                .length(request.getLength())
                .width(request.getWidth())
                .height(request.getHeight())
                .costPrice(request.getCostPrice())
                .price(request.getPrice())
                .discountPrice(request.getDiscountPrice())
                .status(request.getStatus())
                .barcode(request.getBarcode())
                .imageUrls(request.getImageUrls())
                .shopId(1)
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
        variant.setStockQuantity(request.getStockQuantity());
        variant.setPriceAdjustment(request.getPriceAdjustment());
        variant.setImageUrl(request.getImageUrl());
        variant.setColor(request.getColor());
        variant.setSize(request.getSize());
        variant.setWeight(request.getWeight());
        variant.setLength(request.getLength());
        variant.setWidth(request.getWidth());
        variant.setHeight(request.getHeight());
        variant.setCostPrice(request.getCostPrice());
        variant.setPrice(request.getPrice());
        variant.setDiscountPrice(request.getDiscountPrice());
        variant.setStatus(request.getStatus());
        variant.setBarcode(request.getBarcode());
        variant.setImageUrls(request.getImageUrls());

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
