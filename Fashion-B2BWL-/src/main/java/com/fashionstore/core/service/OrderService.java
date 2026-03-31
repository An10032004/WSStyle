package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.OrderRequest;
import com.fashionstore.core.dto.request.OrderItemRequest;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.OrderItem;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.OrderRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional
    public Order createOrder(OrderRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Order order = Order.builder()
                .user(user)
                .orderType(request.getOrderType())
                .paymentMethod(request.getPaymentMethod())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .shippingAddress(request.getShippingAddress())
                .note(request.getNote())
                .status("PENDING")
                .paymentStatus("PENDING")
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<OrderItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Variant not found: " + itemReq.getVariantId()));

            BigDecimal itemTotal = itemReq.getUnitPrice().multiply(new BigDecimal(itemReq.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productVariant(variant)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .appliedRuleId(itemReq.getAppliedRuleId())
                    .build();
            items.add(item);
        }

        order.setTotalAmount(totalAmount);
        order.setItems(items);
        order.setDebtAmount(totalAmount); // Initial debt is total amount

        return orderRepository.save(order);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrderById(Integer id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @Transactional
    public Order updateOrderStatus(Integer id, String status) {
        Order order = getOrderById(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }

    @Transactional
    public Order updatePaymentStatus(Integer id, String paymentStatus) {
        Order order = getOrderById(id);
        order.setPaymentStatus(paymentStatus);
        if ("PAID".equals(paymentStatus)) {
            order.setPaidAmount(order.getTotalAmount());
            order.setDebtAmount(BigDecimal.ZERO);
        }
        return orderRepository.save(order);
    }
}
