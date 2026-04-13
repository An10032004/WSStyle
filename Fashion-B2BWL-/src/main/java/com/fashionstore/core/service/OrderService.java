package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.ShippingQuoteResponse;
import com.fashionstore.core.dto.response.DebtOrderReportRowResponse;
import com.fashionstore.core.dto.response.DebtSummaryResponse;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
    private final ShippingRuleService shippingRuleService;
    private final NetTermRuleService netTermRuleService;
    private final TaxDisplayRuleService taxDisplayRuleService;

    /** Bật API debt-summary và chặn đặt hàng khi quá hạn; tắt khi cấu hình flow riêng (app.net-term.debt-check.enabled=false). */
    @Value("${app.net-term.debt-check.enabled:true}")
    private boolean netTermDebtCheckEnabled;

    @Transactional
    public Order createOrder(OrderRequest request) {
        if (request == null || request.getUserId() == null) {
            throw new RuntimeException("Thiếu thông tin người dùng (userId). Vui lòng đăng nhập lại trước khi đặt hàng.");
        }
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (hasOverdueDebt(user.getId())) {
            throw new RuntimeException("Bạn có đơn công nợ quá hạn. Vui lòng thanh toán trước khi tạo đơn mới.");
        }

        List<OrderItemRequest> itemReqs = request.getItems() != null ? request.getItems() : List.of();
        List<ProductVariant> resolvedVariants = new ArrayList<>(itemReqs.size());
        List<OrderLimitService.CartItemDTO> limitCart = new ArrayList<>(itemReqs.size());
        for (OrderItemRequest itemReq : itemReqs) {
            ProductVariant variant;
            if (itemReq.getVariantId() != null) {
                variant = productVariantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new RuntimeException("Variant not found: " + itemReq.getVariantId()));
            } else if (itemReq.getProductId() != null) {
                variant = productVariantRepository.findByProductId(itemReq.getProductId()).stream()
                        .sorted((a, b) -> Integer.compare(
                                a.getId() != null ? a.getId() : Integer.MAX_VALUE,
                                b.getId() != null ? b.getId() : Integer.MAX_VALUE))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể cho sản phẩm: " + itemReq.getProductId()));
            } else {
                throw new RuntimeException("Dòng sản phẩm thiếu cả variantId và productId.");
            }
            resolvedVariants.add(variant);
            Product product = variant.getProduct();
            Integer categoryId = product != null ? product.getCategoryId() : null;
            limitCart.add(OrderLimitService.CartItemDTO.builder()
                    .productId(variant.getProductId())
                    .categoryId(categoryId)
                    .variantId(variant.getId())
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
                    .pricingNote(itemReq.getPricingNote())
                    .build();
            items.add(item);
        }

        int totalQty = itemReqs.stream().mapToInt(OrderItemRequest::getQuantity).sum();
        
        // --- Coupon Logic ---
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getCouponCode() != null && !request.getCouponCode().isEmpty()) {
            discountAmount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;
            order.setCouponCode(request.getCouponCode());
            order.setDiscountAmount(discountAmount);
        }
        
        BigDecimal discountedSubtotal = totalAmount.subtract(discountAmount);
        if (discountedSubtotal.compareTo(BigDecimal.ZERO) < 0) discountedSubtotal = BigDecimal.ZERO;

        // Shipping logic based on discounted subtotal
        ShippingQuoteResponse shipQuote = shippingRuleService.quote(request.getUserId(), discountedSubtotal, totalQty);
        order.setShippingFee(shipQuote.getFee() != null ? shipQuote.getFee() : BigDecimal.ZERO);
        
        // Tax logic based on discounted subtotal
        var taxQuote = taxDisplayRuleService.quoteTax(request.getUserId(), discountedSubtotal);
        BigDecimal taxAmount = (BigDecimal) taxQuote.getOrDefault("taxAmount", BigDecimal.ZERO);
        order.setTaxAmount(taxAmount);

        BigDecimal finalTotal = discountedSubtotal.add(order.getShippingFee()).add(taxAmount);
        order.setTotalAmount(finalTotal);
        order.setItems(items);
        if ("NET_TERMS".equals(request.getPaymentMethod())) {
            order.setDebtAmount(finalTotal);
            int netDays = resolveNetTermDays(user);
            order.setDueDate(LocalDateTime.now().plusDays(Math.max(netDays, 1)));
        } else {
            order.setDebtAmount(BigDecimal.ZERO);
            order.setDueDate(null);
        }

        // Tồn kho chỉ trừ khi admin xác nhận đơn (PROCESSING), không trừ lúc tạo đơn.
        return orderRepository.save(order);
    }

    private Order requireOrderWithItems(Integer id) {
        return orderRepository.findByIdWithItemVariants(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    /**
     * Trừ tồn kho (idempotent). Gọi khi admin xác nhận đơn — coi như đã lấy hàng / đang chuẩn bị giao.
     */
    private void deductStock(Order order) {
        if (Boolean.TRUE.equals(order.getStockReduced())) return;

        List<OrderItem> items = order.getItems();
        if (items != null) {
            for (OrderItem item : items) {
                ProductVariant variant = item.getProductVariant();
                if (variant == null || variant.getId() == null) continue;
                ProductVariant managed = productVariantRepository.findById(variant.getId()).orElse(variant);
                Integer currentQty = managed.getStockQuantity() != null ? managed.getStockQuantity() : 0;
                int deduct = item.getQuantity() != null ? item.getQuantity() : 0;
                int newQty = currentQty - deduct;
                if (newQty < 0) newQty = 0;
                managed.setStockQuantity(newQty);
                productVariantRepository.save(managed);
            }
        }
        order.setStockReduced(true);
    }

    /**
     * Hoàn tồn kho khi đơn hủy / từ chối / khách không nhận (sau khi đã trừ kho lúc xác nhận đơn).
     */
    private void restoreStock(Order order) {
        if (!Boolean.TRUE.equals(order.getStockReduced())) return;

        List<OrderItem> items = order.getItems();
        if (items != null) {
            for (OrderItem item : items) {
                ProductVariant variant = item.getProductVariant();
                if (variant == null || variant.getId() == null) continue;
                ProductVariant managed = productVariantRepository.findById(variant.getId()).orElse(variant);
                int add = item.getQuantity() != null ? item.getQuantity() : 0;
                int cur = managed.getStockQuantity() != null ? managed.getStockQuantity() : 0;
                managed.setStockQuantity(cur + add);
                productVariantRepository.save(managed);
            }
        }
        order.setStockReduced(false);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
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
        if (status == null || status.isBlank()) {
            throw new RuntimeException("status is required");
        }
        Order order = requireOrderWithItems(id);
        String normalized = status.trim().toUpperCase();
        order.setStatus(normalized);

        // Admin xác nhận đơn → lấy hàng / giao: trừ tồn kho (một lần).
        if ("PROCESSING".equals(normalized)) {
            deductStock(order);
        }
        // Hủy / từ chối / khách không nhận → hoàn lại tồn nếu đã trừ.
        if ("REJECTED".equals(normalized) || "CANCELLED".equals(normalized)) {
            restoreStock(order);
        }
        // Tương thích đơn cũ: duyệt APPROVED mà chưa từng trừ (chưa qua PROCESSING).
        if ("APPROVED".equals(normalized) && !Boolean.TRUE.equals(order.getStockReduced())) {
            deductStock(order);
        }
        return orderRepository.save(order);
    }

    @Transactional
    public Order updatePaymentStatus(Integer id, String paymentStatus) {
        Order order = requireOrderWithItems(id);
        order.setPaymentStatus(paymentStatus);
        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            order.setPaidAmount(order.getTotalAmount());
            order.setDebtAmount(BigDecimal.ZERO);
            // Chỉ ghi nhận thanh toán — không đổi status giao hàng (PENDING/PROCESSING/…) và không trừ tồn.
            // Trừ kho và tiến trình xử lý đơn chỉ qua updateOrderStatus (vd. PROCESSING).
        }
        return orderRepository.save(order);
    }

    /**
     * Admin: đơn hủy/từ chối + đã thu tiền qua QR/CK (VNPAY) — đánh dấu đã chuyển khoản hoàn cho khách.
     */
    @Transactional
    public Order markRefundProcessed(Integer id) {
        Order order = requireOrderWithItems(id);
        String st = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";
        if (!"CANCELLED".equals(st) && !"REJECTED".equals(st)) {
            throw new RuntimeException("Chỉ áp dụng cho đơn đã hủy hoặc từ chối.");
        }
        if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new RuntimeException("Đơn chưa ở trạng thái đã thu tiền — không dùng nút hoàn tiền này.");
        }
        String method = order.getPaymentMethod() != null ? order.getPaymentMethod().trim().toUpperCase() : "";
        if ("COD".equals(method)) {
            throw new RuntimeException("Đơn COD: không dùng hoàn tiền chuyển khoản.");
        }
        if ("NET_TERMS".equals(method)) {
            throw new RuntimeException("Đơn công nợ: dùng mục ghi nhận thanh toán công nợ, không dùng hoàn QR/CK.");
        }
        if (!"VNPAY".equals(method)) {
            throw new RuntimeException("Nút này dành cho đơn đã thu qua chuyển khoản/QR (VNPAY).");
        }
        if (order.getRefundProcessedAt() != null) {
            return order;
        }
        order.setRefundProcessedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    /**
     * Khách xác nhận đã nhận lại tiền hoàn — đóng vòng hoàn tiền, cập nhật payment sang REFUNDED (báo cáo doanh thu loại trừ).
     */
    @Transactional
    public Order confirmRefundReceivedByCustomer(Integer orderId, Integer userId) {
        if (userId == null) {
            throw new RuntimeException("Thiếu userId.");
        }
        Order order = requireOrderWithItems(orderId);
        if (order.getUser() == null || !userId.equals(order.getUser().getId())) {
            throw new RuntimeException("Không khớp chủ đơn hàng.");
        }
        String st = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";
        if (!"CANCELLED".equals(st) && !"REJECTED".equals(st)) {
            throw new RuntimeException("Chỉ áp dụng khi đơn đã hủy hoặc từ chối.");
        }
        if (order.getRefundProcessedAt() == null) {
            throw new RuntimeException("Shop chưa đánh dấu đã hoàn tiền. Vui lòng liên hệ shop.");
        }
        if (order.getRefundConfirmedByCustomerAt() != null) {
            throw new RuntimeException("Bạn đã xác nhận nhận hoàn tiền rồi.");
        }
        order.setRefundConfirmedByCustomerAt(LocalDateTime.now());
        order.setPaymentStatus("REFUNDED");
        order.setPaidAmount(BigDecimal.ZERO);
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public DebtSummaryResponse getDebtSummary(Integer userId) {
        if (!netTermDebtCheckEnabled || userId == null) {
            return DebtSummaryResponse.builder()
                    .blocked(false)
                    .overdueCount(0)
                    .items(List.of())
                    .build();
        }
        List<Order> debts = orderRepository.findDebtOrdersForUserSummary(userId, BigDecimal.ZERO);
        List<DebtOrderReportRowResponse> rows = debts.stream()
                .filter(o -> o.getDueDate() != null)
                .sorted((a, b) -> a.getDueDate().compareTo(b.getDueDate()))
                .map(this::toDebtRow)
                .toList();
        int overdue = (int) rows.stream().filter(r -> r.getDaysLeft() < 0).count();
        return DebtSummaryResponse.builder()
                .blocked(overdue > 0)
                .overdueCount(overdue)
                .items(rows)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DebtOrderReportRowResponse> getDebtReport(String startDate, String endDate) {
        LocalDateTime start = parseDateTime(startDate, LocalDateTime.now().minusDays(30));
        LocalDateTime end = parseDateTime(endDate, LocalDateTime.now());
        return orderRepository.findDebtOrdersForReport(start, end).stream()
                .map(this::toDebtRow)
                .toList();
    }

    private DebtOrderReportRowResponse toDebtRow(Order order) {
        LocalDate today = LocalDate.now();
        LocalDate due = order.getDueDate() != null ? order.getDueDate().toLocalDate() : today;
        long daysLeft = ChronoUnit.DAYS.between(today, due);
        String debtStatus = daysLeft < 0 ? "QUA_HAN" : (daysLeft <= 3 ? "SAP_DEN_HAN" : "CON_HAN");
        return DebtOrderReportRowResponse.builder()
                .orderId(order.getId())
                .customerName(order.getUser() != null ? order.getUser().getFullName() : order.getFullName())
                .customerGroupName(order.getUser() != null && order.getUser().getCustomerGroup() != null ? order.getUser().getCustomerGroup().getName() : null)
                .createdAt(order.getCreatedAt())
                .dueDate(order.getDueDate())
                .daysLeft(daysLeft)
                .debtStatus(debtStatus)
                .paymentStatus(order.getPaymentStatus())
                .build();
    }

    private boolean hasOverdueDebt(Integer userId) {
        if (userId == null) {
            return false;
        }
        return getDebtSummary(userId).isBlocked();
    }

    private int resolveNetTermDays(User user) {
        var q = netTermRuleService.quote(user.getId());
        return q.isEligible() && q.getNetTermDays() != null ? q.getNetTermDays() : 30;
    }

    private LocalDateTime parseDateTime(String dateStr, LocalDateTime defaultDate) {
        if (dateStr == null || dateStr.isEmpty()) return defaultDate;
        try {
            return LocalDateTime.parse(dateStr + "T00:00:00");
        } catch (Exception e) {
            return defaultDate;
        }
    }
}
