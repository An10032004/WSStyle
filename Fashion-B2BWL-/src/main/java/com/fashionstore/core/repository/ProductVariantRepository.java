package com.fashionstore.core.repository;

import com.fashionstore.core.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {

    /**
     * Lấy biến thể theo sản phẩm
     */
    @Query("SELECT pv FROM ProductVariant pv WHERE pv.product.id = :productId")
    List<ProductVariant> findByProductId(@Param("productId") Integer productId);

    /**
     * Tìm biến thể theo SKU
     */
    Optional<ProductVariant> findBySku(String sku);

    /**
     * Đếm biến thể theo từng sản phẩm (một query — dùng cho danh sách SP).
     */
    @Query("SELECT pv.productId, COUNT(pv) FROM ProductVariant pv WHERE pv.productId IN :ids GROUP BY pv.productId")
    List<Object[]> countByProductIdGrouped(@Param("ids") Collection<Integer> ids);
}
