package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.PricingRuleRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.AssistantPricingHintsDTO;
import com.fashionstore.core.model.PricingRule;
import com.fashionstore.core.service.AssistantPricingHintService;
import com.fashionstore.core.service.PricingRuleService;
import com.fashionstore.core.facade.AdminRuleFacade;
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
    private final AdminRuleFacade adminRuleFacade;
    private final AssistantPricingHintService assistantPricingHintService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PricingRule>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.success(pricingRuleService.getAllRules()));
    }

    /**
     * Gợi ý id SP / danh mục thuộc rule QUANTITY_BREAK hoặc B2B_PRICE khớp khách (gồm SPECIFIC theo variantIds).
     * Dùng cho trợ lý AI — đồng bộ logic với giỏ hàng.
     */
    @GetMapping("/assistant-hints")
    public ResponseEntity<ApiResponse<AssistantPricingHintsDTO>> assistantHints(
            @RequestParam(value = "userId", required = false) Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(assistantPricingHintService.computeHints(userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PricingRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(pricingRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PricingRule>> createRule(@Valid @RequestBody PricingRuleRequest request) {
        PricingRule created = adminRuleFacade.savePricingRule(request, null);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pricing rule created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PricingRule>> updateRule(@PathVariable Integer id, @Valid @RequestBody PricingRuleRequest request) {
        PricingRule updated = adminRuleFacade.savePricingRule(request, id);
        return ResponseEntity.ok(ApiResponse.success("Pricing rule updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        pricingRuleService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.success("Pricing rule deleted successfully", null));
    }
}
