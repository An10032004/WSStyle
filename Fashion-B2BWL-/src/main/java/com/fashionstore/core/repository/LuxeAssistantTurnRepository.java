package com.fashionstore.core.repository;

import com.fashionstore.core.model.LuxeAssistantTurn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LuxeAssistantTurnRepository extends JpaRepository<LuxeAssistantTurn, Long> {

    List<LuxeAssistantTurn> findBySession_IdOrderByCreatedAtAsc(Long sessionId);
}
