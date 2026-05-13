package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inventory_inflow_receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryInflowReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryInflowReceiptStatus status;

    /** Thời điểm tạo phiếu (lưu nháp) — hiển thị trên phiếu / lịch sử. */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** Thời điểm xác nhận nhập kho (cộng tồn + ghi vào thống kê chi phí). */
    private LocalDateTime postedAt;

    /** Ngày chứng từ / ngày nhập trên form (có thể khác ngày tạo phiếu). */
    private LocalDate documentDate;

    @Column(length = 2000)
    private String description;

    @Column(name = "shop_id")
    private Long shopId;

    @Column(precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<InventoryInflowReceiptLine> lines = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = InventoryInflowReceiptStatus.DRAFT;
        }
        if (shopId == null) {
            shopId = 1L;
        }
        if (totalAmount == null) {
            totalAmount = BigDecimal.ZERO;
        }
    }
}
