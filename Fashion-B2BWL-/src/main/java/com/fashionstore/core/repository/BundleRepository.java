package com.fashionstore.core.repository;

import com.fashionstore.core.model.Bundle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BundleRepository extends JpaRepository<Bundle, Long> {
}
