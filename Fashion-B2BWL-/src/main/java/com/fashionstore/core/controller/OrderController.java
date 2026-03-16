package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.OrderRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
