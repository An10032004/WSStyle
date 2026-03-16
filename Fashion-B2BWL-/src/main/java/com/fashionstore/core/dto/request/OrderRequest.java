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
    private List<OrderItemRequest> items;
}
