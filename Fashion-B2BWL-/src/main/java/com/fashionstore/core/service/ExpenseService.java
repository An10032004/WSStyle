package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ExpenseRequest;
import com.fashionstore.core.model.Expense;
import com.fashionstore.core.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    public List<Expense> getExpenses(Long shopId) {
        return expenseRepository.findByShopId(shopId);
    }

    public List<Expense> getExpensesByDateRange(Long shopId, LocalDateTime start, LocalDateTime end) {
        return expenseRepository.findByShopIdAndDateBetween(shopId, start, end);
    }

    public Expense createExpense(ExpenseRequest request) {
        Expense expense = Expense.builder()
                .category(request.getCategory())
                .amount(request.getAmount())
                .date(parseDateTime(request.getDate()))
                .description(request.getDescription())
                .shopId(request.getShopId() != null ? request.getShopId() : 1L)
                .build();
        return expenseRepository.save(expense);
    }

    private LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return LocalDateTime.now();
        try {
            if (dateStr.contains("T")) {
                return LocalDateTime.parse(dateStr.substring(0, 19));
            }
            return LocalDateTime.parse(dateStr + "T00:00:00");
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
}
