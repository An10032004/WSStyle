package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ExpenseCategory category;

    private BigDecimal amount;

    private LocalDateTime date;

    /** Chi tiết có thể dài (nhập kho nhiều dòng) — dùng TEXT, không giới hạn 255 ký tự. */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "shop_id")
    private Long shopId;

    /** Ngày chứng từ trên phiếu nhập (chỉ có với chi phí từ nhập kho). */
    @Column(name = "receipt_document_date")
    private LocalDate receiptDocumentDate;

    /** Thời điểm tạo phiếu nháp (chứng từ lưu trước khi xác nhận nhập kho). */
    @Column(name = "receipt_created_at")
    private LocalDateTime receiptCreatedAt;

    public enum ExpenseCategory {
        INVENTORY, SHIPPING, MARKETING, SALARY, OPERATIONS, OTHER
    }
}
