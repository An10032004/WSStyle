package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantReportResponse {
    private List<Row> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Row {
        private Integer variantId;
        private String sku;
        private String productName;
        private Integer soldQuantity;
        private BigDecimal revenue;
        private Integer currentStock;
    }
}
