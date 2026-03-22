package com.fashionstore.core.repository;

import com.fashionstore.core.model.HidePriceRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HidePriceRuleRepository extends JpaRepository<HidePriceRule, Integer> {
}
