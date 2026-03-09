package com.fashionstore.core.repository;

import com.fashionstore.core.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {

    /**
     * Lấy biến thể theo sản phẩm
     */
    List<ProductVariant> findByProductId(Integer productId);

    /**
     * Tìm biến thể theo SKU
     */
    Optional<ProductVariant> findBySku(String sku);
}
