package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.AIResponse;
import com.fashionstore.core.dto.response.AssistantSessionItemDTO;
import com.fashionstore.core.dto.response.AssistantTurnDTO;
import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.LuxeAssistantSession;
import com.fashionstore.core.model.LuxeAssistantTurn;
import com.fashionstore.core.repository.LuxeAssistantSessionRepository;
import com.fashionstore.core.repository.LuxeAssistantTurnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LuxeAssistantHistoryService {

    private final LuxeAssistantSessionRepository sessionRepository;
    private final LuxeAssistantTurnRepository turnRepository;

    @Transactional(readOnly = true)
    public List<AssistantSessionItemDTO> listSessions(Integer userId, int max) {
        if (userId == null) {
            return Collections.emptyList();
        }
        return sessionRepository
                .findByUserIdOrderByUpdatedAtDesc(userId, PageRequest.of(0, Math.max(1, Math.min(max, 100))))
                .stream()
                .map(
                        s -> AssistantSessionItemDTO.builder()
                                .id(s.getId())
                                .title(s.getTitle() != null ? s.getTitle() : "Phiên #" + s.getId())
                                .updatedAt(s.getUpdatedAt() != null ? s.getUpdatedAt() : s.getCreatedAt())
                                .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssistantTurnDTO> listTurns(Long sessionId, Integer userId) {
        if (sessionId == null || userId == null) {
            return Collections.emptyList();
        }
        LuxeAssistantSession session =
                sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !userId.equals(session.getUserId())) {
            return Collections.emptyList();
        }
        List<AssistantTurnDTO> out = new ArrayList<>();
        for (LuxeAssistantTurn t : turnRepository.findBySession_IdOrderByCreatedAtAsc(sessionId)) {
            List<Integer> ids = parseProductIds(t.getProductIdsJson());
            out.add(
                    AssistantTurnDTO.builder()
                            .role(t.getRole())
                            .content(t.getContent())
                            .productIds(ids)
                            .build());
        }
        return out;
    }

    @Transactional
    public Long recordExchange(Long existingSessionId, Integer userId, String userMessage, AIResponse response) {
        if (userId == null || userMessage == null) {
            return null;
        }
        LuxeAssistantSession session = resolveSession(existingSessionId, userId, userMessage);
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepository.save(session);

        LuxeAssistantTurn userTurn =
                LuxeAssistantTurn.builder()
                        .session(session)
                        .role("USER")
                        .content(userMessage)
                        .productIdsJson(null)
                        .createdAt(LocalDateTime.now())
                        .build();
        turnRepository.save(userTurn);

        String idsJson = "[]";
        if (response.getProducts() != null && !response.getProducts().isEmpty()) {
            List<Integer> ids = response.getProducts().stream().map(ProductResponseDTO::getId).toList();
            idsJson = toJsonIntArray(ids);
        }

        LuxeAssistantTurn aiTurn =
                LuxeAssistantTurn.builder()
                        .session(session)
                        .role("ASSISTANT")
                        .content(response.getMessage() != null ? response.getMessage() : "")
                        .productIdsJson(idsJson)
                        .createdAt(LocalDateTime.now())
                        .build();
        turnRepository.save(aiTurn);

        return session.getId();
    }

    private LuxeAssistantSession resolveSession(Long existingSessionId, Integer userId, String userMessage) {
        if (existingSessionId != null) {
            return sessionRepository
                    .findById(existingSessionId)
                    .filter(s -> userId.equals(s.getUserId()))
                    .orElseGet(() -> createSession(userId, userMessage));
        }
        return createSession(userId, userMessage);
    }

    private LuxeAssistantSession createSession(Integer userId, String userMessage) {
        String title = truncate(userMessage, 100);
        LuxeAssistantSession s =
                LuxeAssistantSession.builder()
                        .userId(userId)
                        .title(title)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
        return sessionRepository.save(s);
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replace('\n', ' ').trim();
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }

    /** JSON mảng số nguyên đơn giản {@code [1,2,3]} — không cần bean ObjectMapper. */
    private static String toJsonIntArray(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) {
            return "[]";
        }
        return "[" + ids.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse("") + "]";
    }

    private static List<Integer> parseProductIds(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        String s = json.trim();
        if (!s.startsWith("[") || !s.endsWith("]")) {
            return Collections.emptyList();
        }
        s = s.substring(1, s.length() - 1).trim();
        if (s.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> out = new ArrayList<>();
        for (String part : s.split(",")) {
            String t = part.trim().replace("\"", "");
            if (t.isEmpty()) {
                continue;
            }
            try {
                out.add(Integer.parseInt(t));
            } catch (NumberFormatException e) {
                log.debug("parseProductIds skip: {}", t);
            }
        }
        return out;
    }
}
