package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.OrderRequest;
import com.fashionstore.core.dto.request.OrderItemRequest;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.OrderItem;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.OrderRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final OrderLimitService orderLimitService;

    @Transactional
    public Order createOrder(OrderRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<OrderItemRequest> itemReqs = request.getItems() != null ? request.getItems() : List.of();
        List<ProductVariant> resolvedVariants = new ArrayList<>(itemReqs.size());
        List<OrderLimitService.CartItemDTO> limitCart = new ArrayList<>(itemReqs.size());
        for (OrderItemRequest itemReq : itemReqs) {
            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new RuntimeException("Variant not found: " + itemReq.getVariantId()));
            resolvedVariants.add(variant);
            Product product = variant.getProduct();
            Integer categoryId = product != null ? product.getCategoryId() : null;
            limitCart.add(OrderLimitService.CartItemDTO.builder()
                    .productId(variant.getProductId())
                    .categoryId(categoryId)
                    .quantity(itemReq.getQuantity())
                    .price(itemReq.getUnitPrice())
                    .build());
        }
        List<OrderLimitService.ValidationResult> limitFailures = orderLimitService.validateCart(user, limitCart);
        if (!limitFailures.isEmpty()) {
            String msg = limitFailures.stream()
                    .map(OrderLimitService.ValidationResult::getMessage)
                    .collect(Collectors.joining(" "));
            throw new RuntimeException(msg);
        }

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

        for (int i = 0; i < itemReqs.size(); i++) {
            OrderItemRequest itemReq = itemReqs.get(i);
            ProductVariant variant = resolvedVariants.get(i);

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

        order.setShippingFee(request.getShippingFee() != null ? request.getShippingFee() : BigDecimal.ZERO);
        BigDecimal finalTotal = totalAmount.add(order.getShippingFee());
        order.setTotalAmount(finalTotal);
        order.setItems(items);
        order.setDebtAmount(finalTotal); // Initial debt is total amount including shipping

        return orderRepository.save(order);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByUserId(Integer userId) {
        return orderRepository.findByUserId(userId);
    }

    public Page<Order> getOrdersByUserIdPaged(Integer userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable);
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
