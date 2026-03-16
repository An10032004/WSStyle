package com.fashionstore.core.service;

import com.fashionstore.core.model.SubscriptionPlan;
import com.fashionstore.core.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository planRepository;

    @PostConstruct
    public void init() {
        if (planRepository.count() == 0) {
            planRepository.save(new SubscriptionPlan(null, "Basic", java.math.BigDecimal.valueOf(19.0), java.math.BigDecimal.valueOf(190.0), "{\"products\": 100, \"users\": 2}", "ACTIVE"));
            planRepository.save(new SubscriptionPlan(null, "Professional", java.math.BigDecimal.valueOf(49.0), java.math.BigDecimal.valueOf(490.0), "{\"products\": 1000, \"users\": 10}", "ACTIVE"));
            planRepository.save(new SubscriptionPlan(null, "Enterprise", java.math.BigDecimal.valueOf(199.0), java.math.BigDecimal.valueOf(1990.0), "{\"products\": \"unlimited\", \"users\": \"unlimited\"}", "ACTIVE"));
        }
    }

    public List<SubscriptionPlan> getAllPlans() {
        return planRepository.findAll();
    }

    public SubscriptionPlan createPlan(SubscriptionPlan plan) {
        return planRepository.save(plan);
    }

    public SubscriptionPlan updatePlan(Integer id, SubscriptionPlan planDetails) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
        plan.setName(planDetails.getName());
        plan.setMonthlyPrice(planDetails.getMonthlyPrice());
        plan.setYearlyPrice(planDetails.getYearlyPrice());
        plan.setFeatures(planDetails.getFeatures());
        plan.setStatus(planDetails.getStatus());
        return planRepository.save(plan);
    }
}
