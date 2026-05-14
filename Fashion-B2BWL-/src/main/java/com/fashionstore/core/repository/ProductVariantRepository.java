package com.fashionstore.core.repository;

import com.fashionstore.core.dto.response.InventoryInflowVariantRowResponse;
import com.fashionstore.core.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {

    /**
     * Lấy biến thể theo sản phẩm (kèm sản phẩm cha — trạng thái JSON productStatus).
     */
    @Query("SELECT pv FROM ProductVariant pv JOIN FETCH pv.product WHERE pv.product.id = :productId ORDER BY pv.id ASC")
    List<ProductVariant> findByProductId(@Param("productId") Integer productId);

    @Query("SELECT pv FROM ProductVariant pv JOIN FETCH pv.product WHERE pv.id = :id")
    Optional<ProductVariant> findByIdWithProduct(@Param("id") Integer id);

    @Query("SELECT pv FROM ProductVariant pv JOIN FETCH pv.product WHERE LOWER(pv.sku) = LOWER(:sku)")
    Optional<ProductVariant> findBySkuIgnoreCaseWithProduct(@Param("sku") String sku);

    /** Chỉ các cột cần cho UI nhập kho — nhẹ hơn trả về entity đầy đủ. */
    @Query(
            "SELECT new com.fashionstore.core.dto.response.InventoryInflowVariantRowResponse("
                    + "v.id, v.sku, v.stockQuantity, v.costPrice, v.imageUrl, v.color, v.size) "
                    + "FROM ProductVariant v WHERE v.product.id = :productId ORDER BY v.id ASC")
    List<InventoryInflowVariantRowResponse> findInflowRowsByProductId(@Param("productId") Integer productId);

    /** Một query batch cho nhiều sản phẩm — UI admin chọn variant theo trang SP. */
    @Query(
            "SELECT pv FROM ProductVariant pv WHERE pv.productId IN :productIds ORDER BY pv.productId ASC, pv.id ASC")
    List<ProductVariant> findByProductIdInOrderByProductIdAscIdAsc(@Param("productIds") Collection<Integer> productIds);

    /**
     * Tìm biến thể theo SKU
     */
    Optional<ProductVariant> findBySku(String sku);

    Optional<ProductVariant> findBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Integer id);

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
                SELECT vv.product_id, MIN(vv.id) AS min_id
                FROM product_variants vv
                INNER JOIN products pp ON pp.id = vv.product_id
                WHERE vv.product_id IN (:ids)
                  AND (pp.status IS NULL OR TRIM(COALESCE(pp.status, '')) = '' OR UPPER(TRIM(pp.status)) <> 'INACTIVE')
                  AND (vv.status IS NULL OR TRIM(COALESCE(vv.status, '')) = '' OR UPPER(TRIM(vv.status)) <> 'INACTIVE')
                GROUP BY vv.product_id
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
                  AND (p2.status IS NULL OR TRIM(COALESCE(p2.status, '')) = '' OR UPPER(TRIM(p2.status)) <> 'INACTIVE')
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

    /** Tổng tồn SKU đang bán (không INACTIVE) theo sản phẩm — dùng AI / shop. */
    @Query(value = """
            SELECT v.product_id, COALESCE(SUM(v.stock_quantity), 0)
            FROM product_variants v
            INNER JOIN products p ON p.id = v.product_id
            WHERE v.product_id IN (:ids)
              AND (p.status IS NULL OR TRIM(COALESCE(p.status, '')) = '' OR UPPER(TRIM(p.status)) <> 'INACTIVE')
              AND (v.status IS NULL OR TRIM(COALESCE(v.status, '')) = '' OR UPPER(TRIM(v.status)) <> 'INACTIVE')
            GROUP BY v.product_id
            """, nativeQuery = true)
    List<Object[]> sumSellableStockByProductIds(@Param("ids") Collection<Integer> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ProductVariant v SET v.status = 'INACTIVE' WHERE v.product.id = :productId")
    int deactivateAllVariantsByProductId(@Param("productId") Integer productId);
}
