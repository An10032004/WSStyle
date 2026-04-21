package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.request.TaxDisplayRuleRequest;
import com.fashionstore.core.model.TaxDisplayRule;
import com.fashionstore.core.service.TaxDisplayRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tax-display-rules")
@RequiredArgsConstructor
public class TaxDisplayRuleController {

    private final TaxDisplayRuleService taxDisplayRuleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaxDisplayRule>>> getAllRules() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Fetched successfully", taxDisplayRuleService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaxDisplayRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Fetched successfully", taxDisplayRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaxDisplayRule>> createRule(@RequestBody TaxDisplayRuleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Created successfully", taxDisplayRuleService.createRule(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaxDisplayRule>> updateRule(@PathVariable Integer id, @RequestBody TaxDisplayRuleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Updated successfully", taxDisplayRuleService.updateRule(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        taxDisplayRuleService.deleteRule(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Deleted successfully", null));
    }

    @PostMapping("/quote")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> quoteTax(@RequestBody java.util.Map<String, Object> request) {
        Integer userId = null;
        if (request.get("userId") != null) {
            userId = Integer.parseInt(request.get("userId").toString());
        }
        java.math.BigDecimal orderAmount = new java.math.BigDecimal(request.get("orderAmount").toString());
        return ResponseEntity.ok(new ApiResponse<>(true, "Tax quoted", taxDisplayRuleService.quoteTax(userId, orderAmount)));
    }
}
