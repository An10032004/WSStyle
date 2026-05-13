package com.fashionstore.core.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class AiAssistantAdminContextResponse {
    Integer id;
    String title;
    String body;
    Integer sortOrder;
    boolean active;
    Instant createdAt;
    Instant updatedAt;
}
