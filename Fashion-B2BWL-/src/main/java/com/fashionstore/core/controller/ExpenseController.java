package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ExpenseRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Expense;
import com.fashionstore.core.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public ApiResponse<List<Expense>> getExpenses(
            @RequestParam(defaultValue = "1") Long shopId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null) {
            LocalDateTime start = parseDateTime(startDate, false);
            LocalDateTime end = parseDateTime(endDate, true);
            return ApiResponse.success(expenseService.getExpensesByDateRange(shopId, start, end));
        }
        return ApiResponse.success(expenseService.getExpenses(shopId));
    }

    private LocalDateTime parseDateTime(String dateStr, boolean isEnd) {
        if (dateStr == null || dateStr.isEmpty()) return isEnd ? LocalDateTime.now() : LocalDateTime.now().minusYears(1);
        try {
            if (dateStr.contains("T")) {
                return LocalDateTime.parse(dateStr.substring(0, 19));
            }
            return isEnd ? LocalDateTime.parse(dateStr + "T23:59:59") : LocalDateTime.parse(dateStr + "T00:00:00");
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    @PostMapping
    public ApiResponse<Expense> createExpense(@RequestBody ExpenseRequest request) {
        return ApiResponse.success(expenseService.createExpense(request));
    }
}
