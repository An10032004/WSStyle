package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ExpenseRequest;
import com.fashionstore.core.dto.request.InventoryInflowItemRequest;
import com.fashionstore.core.dto.request.InventoryInflowRequest;
import com.fashionstore.core.model.Expense.ExpenseCategory;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryInflowService {

    private final ProductVariantRepository variantRepository;
    private final ExpenseService expenseService;

    @Transactional
    public void processInflow(InventoryInflowRequest request) {
        BigDecimal totalCost = BigDecimal.ZERO;
        List<String> details = new ArrayList<>();

        if (request.getItems() == null || request.getItems().isEmpty()) {
            return;
        }

        for (InventoryInflowItemRequest item : request.getItems()) {
            ProductVariant variant = variantRepository.findById(item.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Variant not found: " + item.getVariantId()));

            // Update stock
            int oldStock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(oldStock + (item.getQuantity() != null ? item.getQuantity() : 0));
            
            // Update cost price
            if (item.getCostPrice() != null) {
                variant.setCostPrice(item.getCostPrice());
            }

            variantRepository.save(variant);

            // Calculate cost
            BigDecimal itemTotal = item.getCostPrice() != null && item.getQuantity() != null
                ? item.getCostPrice().multiply(new BigDecimal(item.getQuantity()))
                : BigDecimal.ZERO;
            totalCost = totalCost.add(itemTotal);
            
            details.add(String.format("%s (x%d)", variant.getSku(), item.getQuantity()));
        }

        // Create Expense
        ExpenseRequest expenseRequest = new ExpenseRequest();
        expenseRequest.setCategory(ExpenseCategory.INVENTORY);
        expenseRequest.setAmount(totalCost);
        expenseRequest.setDate(request.getDate());
        expenseRequest.setDescription(request.getDescription() != null && !request.getDescription().isBlank() 
            ? request.getDescription() 
            : "Nhập hàng: " + String.join(", ", details));
        
        expenseService.createExpense(expenseRequest);
    }
}
