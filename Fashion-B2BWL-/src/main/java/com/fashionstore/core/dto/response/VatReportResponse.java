package com.fashionstore.core.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VatReportResponse {
    private BigDecimal collectedVat;
    private BigDecimal payableVat;
    private BigDecimal netVat;
}
