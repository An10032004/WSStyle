package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ShippingRuleRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.ShippingRule;
import com.fashionstore.core.service.ShippingRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShippingRuleController {

    private final ShippingRuleService shippingRuleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingRule>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.success(shippingRuleService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(shippingRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShippingRule>> createRule(@Valid @RequestBody ShippingRuleRequest request) {
        ShippingRule created = shippingRuleService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Shipping rule created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingRule>> updateRule(@PathVariable Integer id, @Valid @RequestBody ShippingRuleRequest request) {
        ShippingRule updated = shippingRuleService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.success("Shipping rule updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        shippingRuleService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.success("Shipping rule deleted successfully", null));
    }
}
