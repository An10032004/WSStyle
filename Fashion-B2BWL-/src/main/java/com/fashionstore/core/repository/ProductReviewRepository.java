package com.fashionstore.core.repository;

import com.fashionstore.core.model.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Integer> {
    List<ProductReview> findByProductId(Integer productId);
    java.util.Optional<ProductReview> findByUserIdAndProductId(Integer userId, Integer productId);
}
