package com.fashionstore.core.repository;

import com.fashionstore.core.model.CustomerGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerGroupRepository extends JpaRepository<CustomerGroup, Integer> {
}
