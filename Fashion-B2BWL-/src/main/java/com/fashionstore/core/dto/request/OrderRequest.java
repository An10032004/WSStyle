package com.fashionstore.core.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {
    private Integer userId;
    private String orderType; // RETAIL, WHOLESALE
    private String paymentMethod; // COD, VNPAY, NET_TERMS
    private String fullName;
    private String phone;
    private String shippingAddress;
    private String note;
    private java.math.BigDecimal shippingFee;
    private java.math.BigDecimal taxAmount;
    private String couponCode;
    private java.math.BigDecimal discountAmount;
    private List<OrderItemRequest> items;
}
