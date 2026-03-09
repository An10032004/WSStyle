package com.fashionstore.core.repository;

import com.fashionstore.core.model.OrderLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderLimitRepository extends JpaRepository<OrderLimit, Integer> {
}
