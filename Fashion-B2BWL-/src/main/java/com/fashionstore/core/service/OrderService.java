package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.ShippingQuoteResponse;
import com.fashionstore.core.dto.response.DebtOrderReportRowResponse;
import com.fashionstore.core.dto.response.DebtSummaryResponse;
import com.fashionstore.core.constant.OrderValidationMessages;
import com.fashionstore.core.dto.request.OrderRequest;
import com.fashionstore.core.dto.request.OrderItemRequest;
import com.fashionstore.core.model.Coupon;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.OrderItem;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.model.User;
import com.fashionstore.core.model.ChatMessage;
import com.fashionstore.core.repository.ChatMessageRepository;
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
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Service
@RequiredArgsConstructor
public class OrderService {

    /** Đồng bộ đăng ký / thanh toán storefront: 10 chữ số bắt đầu bằng 0. */
    private static final Pattern CHECKOUT_PHONE_VN = Pattern.compile("^0[0-9]{9}$");
    private static final String GUEST_EMAIL_SUFFIX = "@guest.local";
    private static final String GUEST_PHONE_VERIFIED_TAG = "[PHONE_VERIFIED]";

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final OrderLimitService orderLimitService;
    private final ShippingRuleService shippingRuleService;
    private final NetTermRuleService netTermRuleService;
    private final TaxDisplayRuleService taxDisplayRuleService;
    private final ChatMessageRepository chatMessageRepository;
    private final CouponService couponService;

    /** Bật API debt-summary và chặn đặt hàng khi quá hạn; tắt khi cấu hình flow riêng (app.net-term.debt-check.enabled=false). */
    @Value("${app.net-term.debt-check.enabled:true}")
    private boolean netTermDebtCheckEnabled;

    /** User nhận tin nhắn hệ thống khi khách báo thanh toán công nợ (trùng inbox trang Tin nhắn admin). */
    @Value("${app.admin.inbox-user-id:1}")
    private int adminInboxUserId;

    @Transactional
    public Order createOrder(OrderRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(OrderValidationMessages.MISSING_USER_INFO);
        }

        String fullName = request.getFullName() == null ? "" : request.getFullName().trim();
        String phoneRaw = request.getPhone() == null ? "" : request.getPhone().trim();
        String shippingAddr = request.getShippingAddress() == null ? "" : request.getShippingAddress().trim();
        if (fullName.isEmpty() || phoneRaw.isEmpty() || shippingAddr.isEmpty()) {
            throw new IllegalArgumentException(OrderValidationMessages.MISSING_USER_INFO);
        }
        if (!CHECKOUT_PHONE_VN.matcher(phoneRaw).matches()) {
            throw new IllegalArgumentException(OrderValidationMessages.INVALID_PHONE);
        }

        User user;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException(OrderValidationMessages.MISSING_USER_INFO));
        } else {
            user = resolveOrCreateGuestUser(fullName, phoneRaw);
            long openGuestOrders = orderRepository.countGuestOpenOrdersByPhone(phoneRaw);
            if (openGuestOrders > 0) {
                throw new IllegalArgumentException("Số điện thoại này đang có đơn chưa hoàn tất. Vui lòng chờ admin xác nhận đơn trước khi đặt tiếp.");
            }
        }

        if (hasOverdueDebt(user.getId())) {
            throw new IllegalArgumentException(OrderValidationMessages.OVERDUE_DEBT);
        }

        List<OrderItemRequest> itemReqs = request.getItems() != null ? request.getItems() : List.of();
        if (itemReqs.isEmpty()) {
            throw new IllegalArgumentException(OrderValidationMessages.EMPTY_ITEMS);
        }
        for (OrderItemRequest line : itemReqs) {
            if (line.getQuantity() == null || line.getQuantity() <= 0) {
                throw new IllegalArgumentException(OrderValidationMessages.QUANTITY_POSITIVE);
            }
        }
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
                .fullName(fullName)
                .phone(phoneRaw)
                .shippingAddress(shippingAddr)
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
        
        // --- Coupon: luôn tính lại server, không tin discountAmount từ client ---
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getCouponCode() != null && !request.getCouponCode().isBlank()) {
            Coupon coupon = couponService.validateForCheckout(
                    request.getCouponCode(), request.getUserId());
            discountAmount = couponService.computeDiscountAmount(totalAmount, coupon);
            order.setCouponCode(coupon.getCode());
            order.setDiscountAmount(discountAmount);
        } else {
            order.setCouponCode(null);
            order.setDiscountAmount(BigDecimal.ZERO);
        }
        
        BigDecimal discountedSubtotal = totalAmount.subtract(discountAmount);
        if (discountedSubtotal.compareTo(BigDecimal.ZERO) < 0) discountedSubtotal = BigDecimal.ZERO;

        String shipSel = request.getShippingSelection() != null && !request.getShippingSelection().isBlank()
                ? request.getShippingSelection().trim().toUpperCase()
                : "RULE";
        if ("STANDARD".equals(shipSel) || "EXPRESS".equals(shipSel)) {
            if (request.getShippingProvinceCode() == null || request.getShippingProvinceCode().isBlank()) {
                throw new RuntimeException("Vui lòng chọn tỉnh/thành khi chọn giao Standard hoặc Express.");
            }
        }

        ShippingQuoteResponse shipQuote = shippingRuleService.quote(
                request.getUserId(),
                discountedSubtotal,
                totalQty,
                request.getShippingProvinceCode(),
                shipSel);
        if ("STANDARD".equals(shipSel) || "EXPRESS".equals(shipSel)) {
            if (!shipQuote.isZoneMatched()) {
                throw new RuntimeException("Địa chỉ chưa thuộc vùng có phí Standard/Express. Chọn «Theo quy tắc» hoặc liên hệ shop.");
            }
        }
        order.setShippingFee(shipQuote.getFee() != null ? shipQuote.getFee() : BigDecimal.ZERO);
        order.setShippingSelection(shipSel);
        order.setShippingProvinceCode(request.getShippingProvinceCode());
        
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
        Order saved = orderRepository.save(order);
        if (saved.getCouponCode() != null && !saved.getCouponCode().isBlank()) {
            couponService.incrementUsedCount(saved.getCouponCode());
        }
        return saved;
    }

    private User resolveOrCreateGuestUser(String fullName, String phone) {
        String guestEmail = "guest_" + phone + GUEST_EMAIL_SUFFIX;
        return userRepository.findByEmailIgnoreCase(guestEmail).orElseGet(() -> {
            User guest = User.builder()
                    .email(guestEmail)
                    .passwordHash(new BCryptPasswordEncoder().encode("guest-" + phone))
                    .fullName(fullName)
                    .phone(phone)
                    .role("GUEST")
                    .registrationStatus("APPROVED")
                    .active(true)
                    .build();
            return userRepository.save(guest);
        });
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

    @Transactional(readOnly = true)
    public List<Order> getGuestOrdersByPhone(String phone) {
        String normalized = normalizePhone(phone);
        if (!CHECKOUT_PHONE_VN.matcher(normalized).matches()) {
            throw new IllegalArgumentException(OrderValidationMessages.INVALID_PHONE);
        }
        return orderRepository.findGuestOrdersByPhone(normalized);
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
    public Order guestCancelOrder(Integer id, String phone) {
        Order order = requireGuestOrder(id, phone);
        String status = order.getStatus() == null ? "" : order.getStatus().trim().toUpperCase();
        if (!"PENDING".equals(status) && !"PROCESSING".equals(status)) {
            throw new RuntimeException("Đơn này không còn ở trạng thái cho phép hủy.");
        }
        return updateOrderStatus(id, "CANCELLED");
    }

    @Transactional
    public Order guestMarkReceived(Integer id, String phone) {
        Order order = requireGuestOrder(id, phone);
        String status = order.getStatus() == null ? "" : order.getStatus().trim().toUpperCase();
        if (!"PROCESSING".equals(status) && !"SHIPPED".equals(status)) {
            throw new RuntimeException("Đơn chưa ở trạng thái giao hàng để xác nhận đã nhận.");
        }
        return updateOrderStatus(id, "COMPLETED");
    }

    @Transactional
    public Order updatePaymentStatus(Integer id, String paymentStatus) {
        Order order = requireOrderWithItems(id);
        String previousPaymentStatus = order.getPaymentStatus();
        String method = order.getPaymentMethod() != null ? order.getPaymentMethod().trim().toUpperCase() : "";
        String status = order.getStatus() != null ? order.getStatus().trim().toUpperCase() : "";

        // COD: chỉ ghi nhận "đã nhận tiền" sau khi đơn hoàn tất (khách đã nhận hàng).
        if ("COD".equals(method) && "PAID".equalsIgnoreCase(paymentStatus) && !"COMPLETED".equals(status)) {
            throw new IllegalArgumentException("Đơn COD chỉ được xác nhận đã nhận tiền sau khi khách đã nhận hàng.");
        }

        order.setPaymentStatus(paymentStatus);
        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            order.setPaidAmount(order.getTotalAmount());
            order.setDebtAmount(BigDecimal.ZERO);
            // Chỉ ghi nhận thanh toán — không đổi status giao hàng (PENDING/PROCESSING/…) và không trừ tồn.
            // Trừ kho và tiến trình xử lý đơn chỉ qua updateOrderStatus (vd. PROCESSING).
        }
        Order saved = orderRepository.save(order);
        notifyAdminNetTermsPaymentClaim(saved, paymentStatus, previousPaymentStatus);
        return saved;
    }

    /**
     * Khách báo đã chuyển khoản công nợ (AWAITING_CONFIRMATION) — gửi tin vào inbox admin để đối soát / bấm xác nhận trên Quản lý đơn.
     * Chỉ gửi một lần khi chuyển sang AWAITING (tránh spam nếu gọi API trùng).
     */
    private void notifyAdminNetTermsPaymentClaim(Order order, String paymentStatus, String previousPaymentStatus) {
        if (paymentStatus == null || !"AWAITING_CONFIRMATION".equalsIgnoreCase(paymentStatus.trim())) {
            return;
        }
        if (previousPaymentStatus != null
                && "AWAITING_CONFIRMATION".equalsIgnoreCase(previousPaymentStatus.trim())) {
            return;
        }
        String method = order.getPaymentMethod() != null ? order.getPaymentMethod().trim().toUpperCase() : "";
        if (!"NET_TERMS".equals(method)) {
            return;
        }
        if (order.getUser() == null || order.getUser().getId() == null) {
            return;
        }
        String customerName = order.getUser().getFullName() != null ? order.getUser().getFullName() : ("KH #" + order.getUser().getId());
        String body = String.format(
                "[Công nợ] Khách «%s» vừa báo đã thanh toán / cần đối soát — Đơn #%d. Vào Quản lý đơn → chọn đơn → tick xác nhận và bấm «Ghi nhận thanh toán công nợ» khi đã nhận đủ tiền.",
                customerName,
                order.getId());
        ChatMessage msg = ChatMessage.builder()
                .senderId(order.getUser().getId())
                .receiverId(adminInboxUserId)
                .message(body)
                .isRead(false)
                .build();
        chatMessageRepository.save(msg);
    }

    /**
     * Admin: đơn hủy/từ chối + đã thu tiền qua cổng online (VNPAY/MOMO) — đánh dấu đã hoàn tiền cho khách.
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
        if (!"VNPAY".equals(method) && !"MOMO".equals(method)) {
            throw new RuntimeException("Nút này dành cho đơn đã thu qua cổng online (VNPAY/MOMO).");
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

    @Transactional
    public Order confirmRefundReceivedByGuest(Integer orderId, String phone) {
        Order order = requireGuestOrder(orderId, phone);
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

    @Transactional
    public Order verifyGuestPhoneByAdmin(Integer orderId) {
        Order order = requireOrderWithItems(orderId);
        String role = order.getUser() != null && order.getUser().getRole() != null
                ? order.getUser().getRole().trim().toUpperCase()
                : "";
        if (!"GUEST".equals(role)) {
            throw new RuntimeException("Chỉ áp dụng xác nhận SĐT cho đơn guest.");
        }
        String note = order.getNote() == null ? "" : order.getNote();
        if (!note.contains(GUEST_PHONE_VERIFIED_TAG)) {
            String updated = note.isBlank() ? GUEST_PHONE_VERIFIED_TAG : (note + "\n" + GUEST_PHONE_VERIFIED_TAG);
            order.setNote(updated);
        }
        return orderRepository.save(order);
    }

    private Order requireGuestOrder(Integer orderId, String phone) {
        Order order = requireOrderWithItems(orderId);
        String normalizedPhone = normalizePhone(phone);
        if (!CHECKOUT_PHONE_VN.matcher(normalizedPhone).matches()) {
            throw new IllegalArgumentException(OrderValidationMessages.INVALID_PHONE);
        }
        String role = order.getUser() != null && order.getUser().getRole() != null
                ? order.getUser().getRole().trim().toUpperCase()
                : "";
        if (!"GUEST".equals(role)) {
            throw new RuntimeException("Đơn này không thuộc khách mua nhanh.");
        }
        String orderPhone = normalizePhone(order.getPhone());
        if (!normalizedPhone.equals(orderPhone)) {
            throw new RuntimeException("Số điện thoại không khớp với đơn hàng.");
        }
        return order;
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.trim();
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
                .totalAmount(order.getTotalAmount())
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
