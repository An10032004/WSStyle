package com.fashionstore.core.repository;

import com.fashionstore.core.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserId(Integer userId);
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
