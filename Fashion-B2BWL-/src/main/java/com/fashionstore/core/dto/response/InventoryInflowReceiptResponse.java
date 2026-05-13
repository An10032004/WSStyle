package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInflowReceiptResponse {
    private Long id;
    private String status;
    /** ISO-8601 local — lúc tạo / lưu phiếu nháp. */
    private String createdAt;
    /** ISO-8601 local — lúc xác nhận nhập kho (dùng cho thống kê chi phí). */
    private String postedAt;
    /** yyyy-MM-dd — ngày chứng từ trên form. */
    private String documentDate;
    private String description;
    private BigDecimal totalAmount;
    @Builder.Default
    private List<InventoryInflowReceiptLineResponse> lines = new ArrayList<>();
}
