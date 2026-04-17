package com.fashionstore.core.dto.request;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Ước tính phí ship theo tổng đơn (và SL nếu baseOn = QUANTITY_RANGE), theo loại khách — không lọc SP.
 */
@Data
public class ShippingQuoteRequest {
    /** null = khách vãng lai (session chưa đăng nhập) */
    private Integer userId;
    private BigDecimal orderAmount;
    private Integer totalQuantity;

    /** Mã tỉnh/thành (VD: "79") — dùng khớp {@link com.fashionstore.core.model.ShippingZone} */
    private String provinceCode;

    /**
     * RULE = theo bảng phí khoảng giá hiện tại;
     * STANDARD / EXPRESS = theo vùng (nếu tỉnh thuộc vùng đã cấu hình).
     */
    private String shippingSelection;
}
