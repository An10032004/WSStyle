package com.fashionstore.core.repository;

import com.fashionstore.core.model.AIProductSync;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AIProductSyncRepository extends JpaRepository<AIProductSync, Integer> {
    Optional<AIProductSync> findByProductId(Integer productId);
}
