package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.AiAssistantAdminContextRequest;
import com.fashionstore.core.dto.response.AiAssistantAdminContextResponse;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.AiAssistantAdminContext;
import com.fashionstore.core.repository.AiAssistantAdminContextRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiAssistantAdminContextService {

    /** Số bản ghi bật hoạt động tối đa — khớp prompt AI (AssistantStorefrontPromptAugmenter). */
    public static final int MAX_ACTIVE_CONTEXTS_FOR_AI = 3;

    /** Độ dài nội dung ghép vào prompt mỗi bản ghi (ký tự). */
    public static final int MAX_BODY_LENGTH = 500;

    private final AiAssistantAdminContextRepository repository;

    @Transactional(readOnly = true)
    public List<AiAssistantAdminContextResponse> listAll() {
        return repository.findAllByOrderBySortOrderAscIdAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AiAssistantAdminContextResponse getById(Integer id) {
        return toResponse(
                repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("AI context", "id", id)));
    }

    @Transactional
    public AiAssistantAdminContextResponse create(AiAssistantAdminContextRequest req) {
        String body = normalizeBody(req.getBody());
        boolean active = req.getActive() == null || Boolean.TRUE.equals(req.getActive());
        assertActiveSlotAvailable(active, null);
        AiAssistantAdminContext e =
                AiAssistantAdminContext.builder()
                        .title(req.getTitle().trim())
                        .body(body)
                        .sortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0)
                        .active(active)
                        .build();
        return toResponse(repository.save(e));
    }

    @Transactional
    public AiAssistantAdminContextResponse update(Integer id, AiAssistantAdminContextRequest req) {
        AiAssistantAdminContext e =
                repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("AI context", "id", id));
        String body = normalizeBody(req.getBody());
        boolean wasActive = Boolean.TRUE.equals(e.getActive());
        boolean willBeActive = req.getActive() != null ? Boolean.TRUE.equals(req.getActive()) : wasActive;
        assertActiveSlotAvailable(willBeActive, wasActive ? id : null);
        e.setTitle(req.getTitle().trim());
        e.setBody(body);
        if (req.getSortOrder() != null) {
            e.setSortOrder(req.getSortOrder());
        }
        if (req.getActive() != null) {
            e.setActive(req.getActive());
        }
        return toResponse(repository.save(e));
    }

    private static String normalizeBody(String body) {
        if (body == null) {
            return "";
        }
        String t = body.trim();
        if (t.length() > MAX_BODY_LENGTH) {
            throw new IllegalArgumentException(
                    "Nội dung ngữ cảnh tối đa " + MAX_BODY_LENGTH + " ký tự (độ dài dành cho AI đọc).");
        }
        return t;
    }

    /**
     * Chỉ cho phép tối đa {@link #MAX_ACTIVE_CONTEXTS_FOR_AI} bản ghi active; bản ghi {@code excludeId} (đang sửa)
     * đã active thì không tính thêm slot.
     */
    private void assertActiveSlotAvailable(boolean willBeActive, Integer excludeActiveId) {
        if (!willBeActive) {
            return;
        }
        long active = repository.countByActiveTrue();
        if (excludeActiveId != null) {
            AiAssistantAdminContext cur =
                    repository.findById(excludeActiveId).orElse(null);
            if (cur != null && Boolean.TRUE.equals(cur.getActive())) {
                active--;
            }
        }
        if (active >= MAX_ACTIVE_CONTEXTS_FOR_AI) {
            throw new IllegalArgumentException(
                    "Chỉ được tối đa "
                            + MAX_ACTIVE_CONTEXTS_FOR_AI
                            + " ngữ cảnh **bật hoạt động** cùng lúc (AI chỉ đọc tối đa "
                            + MAX_ACTIVE_CONTEXTS_FOR_AI
                            + " khối). Hãy tắt một bản ghi khác rồi thử lại.");
        }
    }

    @Transactional
    public void delete(Integer id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("AI context", "id", id);
        }
        repository.deleteById(id);
    }

    private AiAssistantAdminContextResponse toResponse(AiAssistantAdminContext e) {
        return AiAssistantAdminContextResponse.builder()
                .id(e.getId())
                .title(e.getTitle())
                .body(e.getBody())
                .sortOrder(e.getSortOrder())
                .active(Boolean.TRUE.equals(e.getActive()))
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
