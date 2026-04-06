package com.fashionstore.core.repository;

import com.fashionstore.core.model.AIProductSync;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AIProductSyncRepository extends JpaRepository<AIProductSync, Integer> {
    @Query("SELECT s FROM AIProductSync s WHERE s.product.id = :productId")
    Optional<AIProductSync> findByProductId(@Param("productId") Integer productId);

    /**
     * Tìm các bản ghi chưa có nội dung mô tả AI
     */
    java.util.List<AIProductSync> findByContentIsNull();
}
