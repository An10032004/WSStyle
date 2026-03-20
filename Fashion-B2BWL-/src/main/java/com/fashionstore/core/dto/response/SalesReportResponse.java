package com.fashionstore.core.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesReportResponse {
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal netProfit;
    private Long totalOrders;
    private List<BestSeller> bestSellers;
    private List<RevenuePoint> revenueByDate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BestSeller {
        private String name;
        private Integer quantity;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenuePoint {
        private String date;
        private BigDecimal amount;
    }
}
