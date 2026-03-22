package com.fashionstore.core.repository;

import com.fashionstore.core.model.TaxDisplayRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaxDisplayRuleRepository extends JpaRepository<TaxDisplayRule, Integer> {
}
