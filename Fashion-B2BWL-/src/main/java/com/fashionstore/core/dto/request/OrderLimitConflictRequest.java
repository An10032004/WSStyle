package com.fashionstore.core.dto.request;

import lombok.Data;

@Data
public class OrderLimitConflictRequest {
    /** Bản nháp đang chỉnh (cùng cấu trúc lúc lưu). */
    private OrderLimitRequest draft;
    /** Khi sửa rule, loại trừ chính nó khỏi danh sách so sánh. */
    private Integer excludeRuleId;
}
