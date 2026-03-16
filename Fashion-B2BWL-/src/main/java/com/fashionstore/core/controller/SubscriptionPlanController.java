package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.SubscriptionPlan;
import com.fashionstore.core.service.SubscriptionPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
public class SubscriptionPlanController {

    private final SubscriptionPlanService planService;

    @GetMapping
    public ApiResponse<List<SubscriptionPlan>> getAllPlans() {
        return ApiResponse.success(planService.getAllPlans());
    }

    @PostMapping
    public ApiResponse<SubscriptionPlan> createPlan(@RequestBody SubscriptionPlan plan) {
        return ApiResponse.success(planService.createPlan(plan));
    }

    @PutMapping("/{id}")
    public ApiResponse<SubscriptionPlan> updatePlan(@PathVariable Integer id, @RequestBody SubscriptionPlan plan) {
        return ApiResponse.success(planService.updatePlan(id, plan));
    }
}
