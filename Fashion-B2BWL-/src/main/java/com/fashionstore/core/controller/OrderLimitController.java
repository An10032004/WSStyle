package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.OrderLimitRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.OrderLimit;
import com.fashionstore.core.service.OrderLimitService;
import com.fashionstore.core.facade.AdminRuleFacade;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.UserService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/order-limits")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderLimitController {

    private final OrderLimitService orderLimitService;
    private final AdminRuleFacade adminRuleFacade;
    private final UserService userService;

    @Data
    public static class ValidateCartRequest {
        private Integer userId;
        private List<OrderLimitService.CartItemDTO> items;
    }

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<List<OrderLimitService.ValidationResult>>> validate(@RequestBody ValidateCartRequest request) {
        User user = (request.getUserId() != null) ? userService.getUserById(request.getUserId()) : null;
        return ResponseEntity.ok(ApiResponse.success(orderLimitService.validateCart(user, request.getItems())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderLimit>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.success(orderLimitService.getAllRules()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderLimit>> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(orderLimitService.getRuleById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderLimit>> createRule(@Valid @RequestBody OrderLimitRequest request) {
        OrderLimit created = adminRuleFacade.saveOrderLimit(request, null);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order limit rule created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderLimit>> updateRule(@PathVariable Integer id, @Valid @RequestBody OrderLimitRequest request) {
        OrderLimit updated = adminRuleFacade.saveOrderLimit(request, id);
        return ResponseEntity.ok(ApiResponse.success("Order limit rule updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Integer id) {
        orderLimitService.deleteRule(id);
        return ResponseEntity.ok(ApiResponse.success("Order limit rule deleted successfully", null));
    }
}
