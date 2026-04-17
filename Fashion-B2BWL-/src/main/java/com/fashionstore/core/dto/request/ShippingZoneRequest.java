package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ShippingZoneRequest {
    @NotBlank
    private String name;
    private Integer priority;
    private String status;
    /** JSON array of province codes, e.g. ["79","01"] */
    private String provinceCodes;
    private BigDecimal standardFee;
    private BigDecimal expressFee;
}
