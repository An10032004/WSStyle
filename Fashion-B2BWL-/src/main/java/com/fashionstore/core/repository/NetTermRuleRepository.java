package com.fashionstore.core.repository;

import com.fashionstore.core.model.NetTermRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NetTermRuleRepository extends JpaRepository<NetTermRule, Integer> {
}
