package com.fashionstore.core.repository;

import com.fashionstore.core.model.SaleCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleCampaignRepository extends JpaRepository<SaleCampaign, Integer> {
    List<SaleCampaign> findByIsActiveTrue();
}
