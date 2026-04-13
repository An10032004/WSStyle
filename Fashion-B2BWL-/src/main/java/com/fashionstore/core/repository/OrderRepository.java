package com.fashionstore.core.repository;

import com.fashionstore.core.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {

    @Query("""
        SELECT DISTINCT o FROM Order o
        LEFT JOIN FETCH o.items i
        LEFT JOIN FETCH i.productVariant
        WHERE o.id = :id
        """)
    Optional<Order> findByIdWithItemVariants(@Param("id") Integer id);

    List<Order> findByUserId(Integer userId);
    Page<Order> findByUserId(Integer userId, Pageable pageable);
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @org.springframework.data.jpa.repository.Query("""
        SELECT o FROM Order o
        LEFT JOIN FETCH o.user u
        LEFT JOIN FETCH u.customerGroup
        WHERE u.id = :userId
          AND o.paymentMethod = 'NET_TERMS'
          AND o.debtAmount > :minDebt
        """)
    List<Order> findDebtOrdersForUserSummary(@Param("userId") Integer userId, @Param("minDebt") BigDecimal minDebt);

    @org.springframework.data.jpa.repository.Query("""
        SELECT o FROM Order o
        LEFT JOIN FETCH o.user u
        LEFT JOIN FETCH u.customerGroup cg
        WHERE o.paymentMethod = 'NET_TERMS'
          AND o.debtAmount > 0
          AND o.dueDate IS NOT NULL
          AND o.createdAt BETWEEN :start AND :end
        ORDER BY o.dueDate ASC
    """)
    List<Order> findDebtOrdersForReport(@org.springframework.data.repository.query.Param("start") LocalDateTime start,
                                        @org.springframework.data.repository.query.Param("end") LocalDateTime end);
}
