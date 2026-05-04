package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AICustomerInsightResponse {
    private String insight;
    private String sentiment; // POSITIVE, NEUTRAL, NEGATIVE, ANGRY
    private List<String> suggestedActions;
    private List<String> predictedInterests;
}
