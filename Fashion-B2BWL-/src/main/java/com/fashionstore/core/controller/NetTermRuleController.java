package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.NetTermRuleRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.NetTermRule;
import com.fashionstore.core.service.NetTermRuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/net-term-rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NetTermRuleController {

    private final NetTermRuleService netTermRuleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NetTermRule>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.success(netTermRuleService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NetTermRule>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(netTermRuleService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NetTermRule>> createRule(@Valid @RequestBody NetTermRuleRequest request) {
        NetTermRule created = netTermRuleService.createRule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Net term rule created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NetTermRule>> updateRule(@PathVariable Integer id, @Valid @RequestBody NetTermRuleRequest request) {
        NetTermRule updated = netTermRuleService.updateRule(id, request);
        return ResponseEntity.ok(ApiResponse.success("Net term rule updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        netTermRuleService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.success("Net term rule deleted successfully", null));
    }
}
