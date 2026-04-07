package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.OrderRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.DebtOrderReportRowResponse;
import com.fashionstore.core.dto.response.DebtSummaryResponse;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ApiResponse<Order> createOrder(@RequestBody OrderRequest request) {
        return ApiResponse.success(orderService.createOrder(request));
    }

    @GetMapping
    public ApiResponse<List<Order>> getAllOrders() {
        return ApiResponse.success(orderService.getAllOrders());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Order>>> getOrdersByUser(@PathVariable("userId") Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByUserId(userId)));
    }

    @GetMapping("/user/{userId}/debt-summary")
    public ResponseEntity<ApiResponse<DebtSummaryResponse>> getDebtSummary(@PathVariable("userId") Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getDebtSummary(userId)));
    }

    @GetMapping("/debt-report")
    public ResponseEntity<ApiResponse<List<DebtOrderReportRowResponse>>> getDebtReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getDebtReport(startDate, endDate)));
    }

    @GetMapping("/paged")
    public ResponseEntity<ApiResponse<Page<Order>>> getOrdersByUserPaged(
            @RequestParam("userId") Integer userId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrdersByUserIdPaged(userId, pageable)));
    }

    @GetMapping("/{id}")
    public ApiResponse<Order> getOrderById(@PathVariable Integer id) {
        return ApiResponse.success(orderService.getOrderById(id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Order> updateOrderStatus(@PathVariable Integer id, @RequestParam String status) {
        return ApiResponse.success(orderService.updateOrderStatus(id, status));
    }

    @PatchMapping("/{id}/payment-status")
    public ApiResponse<Order> updatePaymentStatus(@PathVariable Integer id, @RequestParam String paymentStatus) {
        return ApiResponse.success(orderService.updatePaymentStatus(id, paymentStatus));
    }
}
