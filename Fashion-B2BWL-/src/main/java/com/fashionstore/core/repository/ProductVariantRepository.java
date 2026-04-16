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

    /**
     * Một dòng / sản phẩm: biến thể «bán được» (không INACTIVE; null/blank = coi như bán) có id nhỏ nhất — giống {@code isVariantAvailableForSale} phía FE.
     */
    @Query(value = """
            SELECT v.product_id, v.discount_price, v.price, v.price_adjustment
            FROM product_variants v
            INNER JOIN (
                SELECT product_id, MIN(id) AS min_id
                FROM product_variants
                WHERE product_id IN (:ids)
                  AND (status IS NULL OR TRIM(COALESCE(status, '')) = '' OR UPPER(TRIM(status)) <> 'INACTIVE')
                GROUP BY product_id
            ) t ON v.product_id = t.product_id AND v.id = t.min_id
            """, nativeQuery = true)
    List<Object[]> findFirstSellableVariantPricingByProductIds(@Param("ids") Collection<Integer> ids);

    /**
     * Khi biến thể MIN(id) không cho giá dương nhưng vẫn còn SKU khác: lấy MIN(id) trong các biến thể bán được có giá niêm yết &gt; 0
     * (discount hoặc price hoặc base sản phẩm + adjustment &gt; 0).
     */
    @Query(value = """
            SELECT v.product_id, v.discount_price, v.price, v.price_adjustment
            FROM product_variants v
            INNER JOIN (
                SELECT v2.product_id, MIN(v2.id) AS min_id
                FROM product_variants v2
                INNER JOIN products p2 ON p2.id = v2.product_id
                WHERE v2.product_id IN (:ids)
                  AND (v2.status IS NULL OR TRIM(COALESCE(v2.status, '')) = '' OR UPPER(TRIM(v2.status)) <> 'INACTIVE')
                  AND (
                    (v2.discount_price IS NOT NULL AND v2.discount_price > 0)
                    OR (v2.price IS NOT NULL AND v2.price > 0)
                    OR (COALESCE(p2.base_price, 0) + COALESCE(v2.price_adjustment, 0) > 0)
                  )
                GROUP BY v2.product_id
            ) t ON v.product_id = t.product_id AND v.id = t.min_id
            """, nativeQuery = true)
    List<Object[]> findFirstSellableVariantWithPositiveListPriceByProductIds(@Param("ids") Collection<Integer> ids);
}
