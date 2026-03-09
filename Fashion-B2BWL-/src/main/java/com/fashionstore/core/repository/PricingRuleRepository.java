package com.fashionstore.core.repository;

import com.fashionstore.core.model.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PricingRuleRepository extends JpaRepository<PricingRule, Integer> {
}
