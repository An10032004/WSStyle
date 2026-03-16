package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_product_sync")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIProductSync {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "vector_id")
    private String vectorId;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "shop_id")
    private Integer shopId;
}
