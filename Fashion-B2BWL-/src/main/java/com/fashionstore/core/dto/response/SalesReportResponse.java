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
        /** yyyy-MM-dd (theo ngày tạo đơn). */
        private String date;
        /** Doanh thu ghi nhận trong ngày (chỉ đơn PAID, cùng quy tắc tổng doanh thu). */
        private BigDecimal amount;
        /** Số đơn PAID có ngày tạo = `date`. */
        private Integer paidOrderCount;
        /** Tổng số lượng dòng hàng (order line qty) trong các đơn PAID của ngày. */
        private Integer itemsSoldQuantity;
        /** Mỗi đơn PAID một dòng: #id · tên · tiền (tương thích client cũ). */
        private String paidOrdersSummary;
        /** Các đơn PAID trong ngày (để UI bấm mở chi tiết). */
        private List<PaidOrderLine> paidOrders;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaidOrderLine {
        private Integer orderId;
        private String customerLabel;
        private BigDecimal amount;
    }
}
