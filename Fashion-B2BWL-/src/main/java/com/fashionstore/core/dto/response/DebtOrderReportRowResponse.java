package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtOrderReportRowResponse {
    private Integer orderId;
    private String customerName;
    private String customerGroupName;
    private LocalDateTime createdAt;
    private LocalDateTime dueDate;
    private long daysLeft;
    private String debtStatus; // CON_HAN | SAP_DEN_HAN | QUA_HAN
    private String paymentStatus;
    /** Tổng giá trị đơn (NET_TERMS) — hiển thị cho khách / báo cáo. */
    private BigDecimal totalAmount;
}

