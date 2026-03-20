package com.fashionstore.core.dto.request;

import com.fashionstore.core.model.Expense.ExpenseCategory;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExpenseRequest {
    private ExpenseCategory category;
    private BigDecimal amount;
    private String date; // ISO Date String
    private String description;
    private Long shopId;
}
