package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.PricingRuleRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.service.PricingRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pricing-rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PricingRuleController {

    private final PricingRuleService pricingRuleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PricingRule>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.success(pricingRuleService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PricingRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(pricingRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PricingRule>> createRule(@Valid @RequestBody PricingRuleRequest request) {
        PricingRule created = pricingRuleService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pricing rule created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PricingRule>> updateRule(@PathVariable Integer id, @Valid @RequestBody PricingRuleRequest request) {
        PricingRule updated = pricingRuleService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.success("Pricing rule updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        pricingRuleService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.success("Pricing rule deleted successfully", null));
    }
}
