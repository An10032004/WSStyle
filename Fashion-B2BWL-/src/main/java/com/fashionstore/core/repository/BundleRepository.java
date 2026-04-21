package com.fashionstore.core.repository;

import com.fashionstore.core.model.Bundle;
import com.fashionstore.core.model.Bundle.BundleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BundleRepository extends JpaRepository<Bundle, Long> {

    @Query("SELECT DISTINCT b FROM Bundle b LEFT JOIN FETCH b.items")
    List<Bundle> findAllWithItems();

    @Query("SELECT DISTINCT b FROM Bundle b LEFT JOIN FETCH b.items WHERE b.id = :id")
    Optional<Bundle> findByIdWithItems(@Param("id") Long id);

    /** Bundle ACTIVE có ít nhất một biến thể thuộc sản phẩm. */
    @Query("SELECT DISTINCT b FROM Bundle b LEFT JOIN FETCH b.items bi WHERE bi.variantId IN "
            + "(SELECT v.id FROM ProductVariant v WHERE v.product.id = :productId) AND b.status = 'ACTIVE'")
    List<Bundle> findActiveContainingProductId(@Param("productId") Integer productId);

    /** Bundle ACTIVE có item trỏ đúng biến thể (trang chi tiết SP — theo variant đang chọn). */
    @Query("SELECT DISTINCT b FROM Bundle b LEFT JOIN FETCH b.items bi WHERE bi.variantId = :variantId AND b.status = 'ACTIVE'")
    List<Bundle> findActiveContainingVariantId(@Param("variantId") Long variantId);

    /** Tên bundle chứa từ khóa (ACTIVE), mới nhất trước — dùng gợi ý AI. */
    Page<Bundle> findByStatusAndNameContainingIgnoreCaseOrderByIdDesc(
            BundleStatus status, String name, Pageable pageable);
}
