package com.fashionstore.core.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class InventoryInflowRequest {
    private String date;
    private String description;
    private List<InventoryInflowItemRequest> items;
}
