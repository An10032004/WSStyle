package com.fashionstore.core.repository;

import com.fashionstore.core.model.ShippingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShippingRuleRepository extends JpaRepository<ShippingRule, Integer> {
}
