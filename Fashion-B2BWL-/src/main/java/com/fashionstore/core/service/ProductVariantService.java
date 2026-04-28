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
import java.util.ArrayList;
import java.util.Objects;
import java.util.regex.Pattern;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductVariantService {
    private static final Pattern ATTR_VALUE_ALLOWED_PATTERN =
            Pattern.compile("^[\\p{L}\\p{N}\\s._-]+$");

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
        validateVariantRequest(request, null);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", request.getProductId()));

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(request.getSku().trim())
                .stockQuantity(request.getStockQuantity())
                .imageUrl(request.getImageUrl())
                .color(trimToNull(request.getColor()))
                .size(trimToNull(request.getSize()))
                .weight(trimToNull(request.getWeight()))
                .length(request.getLength())
                .width(request.getWidth())
                .height(request.getHeight())
                .costPrice(request.getCostPrice())
                .price(request.getPrice())
                .status(request.getStatus())
                .barcode(request.getBarcode())
            .imageUrls(normalizeImageUrls(request.getImageUrls()))
                .shopId(1)
                .build();

        return productVariantRepository.save(variant);
    }

    /**
     * Cập nhật biến thể
     */
    public ProductVariant updateVariant(Integer id, ProductVariantRequest request) {
        validateVariantRequest(request, id);
        ProductVariant variant = getVariantById(id);

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Sản phẩm", "id", request.getProductId()));

        variant.setProduct(product);
        variant.setSku(request.getSku().trim());
        variant.setStockQuantity(request.getStockQuantity());
        variant.setImageUrl(request.getImageUrl());
        variant.setColor(trimToNull(request.getColor()));
        variant.setSize(trimToNull(request.getSize()));
        variant.setWeight(trimToNull(request.getWeight()));
        variant.setLength(request.getLength());
        variant.setWidth(request.getWidth());
        variant.setHeight(request.getHeight());
        variant.setCostPrice(request.getCostPrice());
        variant.setPrice(request.getPrice());
        variant.setStatus(request.getStatus());
        variant.setBarcode(request.getBarcode());
        variant.setImageUrls(normalizeImageUrls(request.getImageUrls()));

        return productVariantRepository.save(variant);
    }

    /**
     * Xóa biến thể
     */
    public void deleteVariant(Integer id) {
        ProductVariant variant = getVariantById(id);
        productVariantRepository.delete(variant);
    }

    private String normalizeImageUrls(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty()) return null;
        ObjectMapper om = new ObjectMapper();
        try {
            if (s.startsWith("[") || s.startsWith("{")) {
                // validate JSON
                om.readTree(s);
                return s;
            } else {
                String[] parts = s.split(",");
                List<String> arr = new ArrayList<>();
                for (String p : parts) {
                    String t = p.trim();
                    if (!t.isEmpty()) arr.add(t);
                }
                if (arr.isEmpty()) return null;
                return om.writeValueAsString(arr);
            }
        } catch (Exception e) {
            try {
                List<String> arr = new ArrayList<>();
                arr.add(s);
                return om.writeValueAsString(arr);
            } catch (JsonProcessingException ex) {
                return null;
            }
        }
    }

    private void validateVariantRequest(ProductVariantRequest request, Integer editingId) {
        String sku = request.getSku() == null ? "" : request.getSku().trim();
        if (sku.isEmpty()) {
            throw new IllegalArgumentException("Tất cả các tổ hợp phải có mã SKU");
        }

        if (request.getPrice() == null || request.getPrice().signum() <= 0) {
            throw new IllegalArgumentException("Tất cả các tổ hợp phải có giá hợp lệ");
        }

        validateAttributeValue(request.getColor());
        validateAttributeValue(request.getSize());
        validateAttributeValue(request.getWeight());

        ProductVariant existed = productVariantRepository.findBySkuIgnoreCase(sku).orElse(null);
        if (existed != null) {
            Integer existedId = existed.getId();
            if (editingId == null || !Objects.equals(existedId, editingId)) {
                throw new IllegalArgumentException("SKU [" + sku + "] đã tồn tại trong hệ thống");
            }
        }
    }

    private void validateAttributeValue(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) return;
        if (!ATTR_VALUE_ALLOWED_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Giá trị thuộc tính không hợp lệ: \"" + normalized + "\"");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
