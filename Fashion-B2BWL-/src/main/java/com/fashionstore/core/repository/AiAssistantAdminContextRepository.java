package com.fashionstore.core.repository;

import com.fashionstore.core.model.AiAssistantAdminContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiAssistantAdminContextRepository extends JpaRepository<AiAssistantAdminContext, Integer> {

    List<AiAssistantAdminContext> findByActiveTrueOrderBySortOrderAscIdAsc();

    List<AiAssistantAdminContext> findAllByOrderBySortOrderAscIdAsc();

    long countByActiveTrue();
}
