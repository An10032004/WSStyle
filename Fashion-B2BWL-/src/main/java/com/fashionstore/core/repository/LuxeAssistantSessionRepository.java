package com.fashionstore.core.repository;

import com.fashionstore.core.model.LuxeAssistantSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LuxeAssistantSessionRepository extends JpaRepository<LuxeAssistantSession, Long> {

    List<LuxeAssistantSession> findByUserIdOrderByUpdatedAtDesc(Integer userId, Pageable pageable);
}
