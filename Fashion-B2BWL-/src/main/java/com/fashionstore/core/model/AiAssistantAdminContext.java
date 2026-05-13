package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Đoạn ngữ cảnh do quản trị nhập — ghép vào prompt Luxe Assistant (storefront), tương tự vai trò bổ sung cho
 * {@code site-context.md} nhưng thay đổi được trên DB.
 */
@Entity
@Table(name = "ai_assistant_admin_contexts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAssistantAdminContext {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
