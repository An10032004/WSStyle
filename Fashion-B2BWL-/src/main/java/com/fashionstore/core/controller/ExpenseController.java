package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ExpenseRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Expense;
import com.fashionstore.core.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public ApiResponse<List<Expense>> getExpenses(@RequestParam(defaultValue = "1") Long shopId) {
        return ApiResponse.success(expenseService.getExpenses(shopId));
    }

    @PostMapping
    public ApiResponse<Expense> createExpense(@RequestBody ExpenseRequest request) {
        return ApiResponse.success(expenseService.createExpense(request));
    }
}
