package com.fashionstore.core.repository;

import com.fashionstore.core.model.InventoryInflowReceipt;
import com.fashionstore.core.model.InventoryInflowReceiptStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryInflowReceiptRepository extends JpaRepository<InventoryInflowReceipt, Long> {

    Page<InventoryInflowReceipt> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);

    Page<InventoryInflowReceipt> findByShopIdAndStatusOrderByCreatedAtDesc(
            Long shopId, InventoryInflowReceiptStatus status, Pageable pageable);

    /** Một query: phiếu + dòng — tránh N+1 khi đọc / xác nhận. */
    @Query("SELECT DISTINCT r FROM InventoryInflowReceipt r LEFT JOIN FETCH r.lines WHERE r.id = :id")
    Optional<InventoryInflowReceipt> findWithLinesById(@Param("id") Long id);
}
