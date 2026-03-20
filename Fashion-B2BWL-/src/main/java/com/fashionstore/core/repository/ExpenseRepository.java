package com.fashionstore.core.repository;

import com.fashionstore.core.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByShopId(Long shopId);
    List<Expense> findByShopIdAndDateBetween(Long shopId, LocalDateTime start, LocalDateTime end);
}
