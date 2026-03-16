package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.request.HidePriceRuleRequest;
import com.fashionstore.core.model.HidePriceRule;
import com.fashionstore.core.service.HidePriceRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hide-price-rules")
@RequiredArgsConstructor
public class HidePriceRuleController {

    private final HidePriceRuleService hidePriceRuleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<HidePriceRule>>> getAllRules() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Fetched successfully", hidePriceRuleService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HidePriceRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Fetched successfully", hidePriceRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HidePriceRule>> createRule(@RequestBody HidePriceRuleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Created successfully", hidePriceRuleService.createRule(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<HidePriceRule>> updateRule(@PathVariable Integer id, @RequestBody HidePriceRuleRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Updated successfully", hidePriceRuleService.updateRule(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        hidePriceRuleService.deleteRule(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Deleted successfully", null));
    }
}
