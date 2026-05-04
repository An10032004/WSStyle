package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.AICustomerInsightResponse;
import com.fashionstore.core.service.AICustomerManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai/customers")
@RequiredArgsConstructor
public class AdminAICustomerController {

    private final AICustomerManagementService aiCustomerManagementService;

    @GetMapping("/{userId}/insight")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<AICustomerInsightResponse> getCustomerInsight(@PathVariable Integer userId) {
        return ResponseEntity.ok(aiCustomerManagementService.getCustomerInsight(userId));
    }
}
