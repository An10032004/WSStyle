package com.fashionstore.core.service;

import com.fashionstore.core.constant.CouponValidationMessages;
import com.fashionstore.core.model.Coupon;
import com.fashionstore.core.repository.CouponRepository;
import com.fashionstore.core.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CouponService {

    private static final List<String> EXCLUDED_FROM_PRIOR_COUNT = List.of("CANCELLED", "REJECTED");

    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;

    public long countPriorPurchases(Integer userId) {
        if (userId == null) {
            return 0;
        }
        return orderRepository.countPriorOrdersExcludingStatuses(userId, EXCLUDED_FROM_PRIOR_COUNT);
    }

    /** 0 nếu null hoặc &lt; 0. */
    public int minimumPriorOrdersOrZero(Coupon c) {
        Integer n = c.getMinimumPriorOrders();
        if (n == null || n < 0) {
            return 0;
        }
        return n;
    }

    /**
     * Cửa sổ hiệu lực theo lịch: khoảng thời gian đóng {@code [startDate, endDate]} — hai cận đều được tính
     * (đúng phút bắt đầu / kết thúc). Một phía {@code null} = không giới hạn ở phía đó.
     */
    public boolean isWithinSchedule(Coupon c) {
        LocalDateTime now = LocalDateTime.now();
        if (c.getStartDate() != null && now.isBefore(c.getStartDate())) {
            return false;
        }
        if (c.getEndDate() != null && now.isAfter(c.getEndDate())) {
            return false;
        }
        return true;
    }

    /**
     * Validate payload admin (thêm/sửa). {@code existingCouponId} = id bản ghi khi sửa (trừ trùng mã).
     */
    public void validateAdminPayload(Coupon c, Integer existingCouponId) {
        if (c == null) {
            throw new IllegalArgumentException("Thiếu dữ liệu coupon.");
        }
        String code = c.getCode() == null ? "" : c.getCode().trim();
        if (code.isEmpty()) {
            throw new IllegalArgumentException(CouponValidationMessages.CODE_REQUIRED);
        }
        if (code.length() > 100) {
            throw new IllegalArgumentException(CouponValidationMessages.CODE_TOO_LONG);
        }
        couponRepository.findByCodeIgnoreCase(code).ifPresent(other -> {
            if (existingCouponId == null || !other.getId().equals(existingCouponId)) {
                throw new IllegalArgumentException(CouponValidationMessages.CODE_DUPLICATE);
            }
        });

        String dt = c.getDiscountType();
        if (dt == null || dt.isBlank()) {
            throw new IllegalArgumentException(CouponValidationMessages.DISCOUNT_TYPE_REQUIRED);
        }
        String discountType = dt.trim().toUpperCase();
        if (!"PERCENTAGE".equals(discountType) && !"FIXED_AMOUNT".equals(discountType)) {
            throw new IllegalArgumentException(CouponValidationMessages.DISCOUNT_TYPE_REQUIRED);
        }

        if (c.getDiscountValue() == null) {
            throw new IllegalArgumentException(CouponValidationMessages.DISCOUNT_VALUE_REQUIRED);
        }
        BigDecimal dv = c.getDiscountValue();
        if (dv.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(CouponValidationMessages.DISCOUNT_VALUE_REQUIRED);
        }
        if ("PERCENTAGE".equals(discountType) && dv.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException(CouponValidationMessages.DISCOUNT_PERCENT_MAX);
        }

        String st = c.getStatus();
        if (st == null || st.isBlank()) {
            throw new IllegalArgumentException(CouponValidationMessages.STATUS_INVALID);
        }
        String status = st.trim().toUpperCase();
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new IllegalArgumentException(CouponValidationMessages.STATUS_INVALID);
        }

        LocalDateTime start = c.getStartDate();
        LocalDateTime end = c.getEndDate();
        if (start != null && end != null && start.isAfter(end)) {
            throw new IllegalArgumentException(CouponValidationMessages.DATE_RANGE_INVALID);
        }

        if (c.getMinimumPriorOrders() != null && c.getMinimumPriorOrders() < 0) {
            throw new IllegalArgumentException(CouponValidationMessages.MIN_PRIOR_ORDERS_NEGATIVE);
        }
        if (c.getPriority() != null && c.getPriority() < 0) {
            throw new IllegalArgumentException(CouponValidationMessages.PRIORITY_NEGATIVE);
        }
    }

    /** Chuẩn hóa chuỗi trước khi lưu (mã, loại giảm, trạng thái). */
    public void normalizeAdminCouponForSave(Coupon c) {
        if (c.getCode() != null) {
            c.setCode(c.getCode().trim());
        }
        if (c.getDiscountType() != null) {
            c.setDiscountType(c.getDiscountType().trim().toUpperCase());
        }
        if (c.getStatus() != null) {
            c.setStatus(c.getStatus().trim().toUpperCase());
        }
        if (c.getMinimumPriorOrders() == null) {
            c.setMinimumPriorOrders(0);
        }
    }

    public void assertPriorOrdersEligible(Coupon coupon, Integer userId) {
        int need = minimumPriorOrdersOrZero(coupon);
        if (need <= 0) {
            return;
        }
        if (userId == null) {
            throw new RuntimeException("Vui lòng đăng nhập để áp dụng mã ưu đãi này.");
        }
        long prior = countPriorPurchases(userId);
        if (prior < need) {
            throw new RuntimeException(
                    "Mã chỉ dành cho khách đã có ít nhất " + need + " đơn hàng (bạn đang có " + prior + " đơn hợp lệ).");
        }
    }

    /**
     * Kiểm tra mã khi đặt hàng / validate API.
     * (Không dùng giới hạn lượt / đơn tối thiểu / trần giảm % — chỉ lịch + trạng thái + số đơn đã mua tối thiểu.)
     */
    public Coupon validateForCheckout(String code, Integer userId) {
        if (code == null || code.isBlank()) {
            throw new RuntimeException("Thiếu mã giảm giá.");
        }
        Coupon coupon = couponRepository.findByCode(code.trim())
                .orElseThrow(() -> new RuntimeException("Mã giảm giá này không tồn tại"));
        if (!"ACTIVE".equals(coupon.getStatus())) {
            throw new RuntimeException("Mã giảm giá này hiện đang bị tạm khóa hoặc đã hết hạn");
        }
        if (!isWithinSchedule(coupon)) {
            throw new RuntimeException("Mã giảm giá không trong thời gian hiệu lực.");
        }
        assertPriorOrdersEligible(coupon, userId);
        return coupon;
    }

    /** Danh sách mã hiển thị ở giỏ/checkout (radio chọn 1). Chỉ khi đã đăng nhập. */
    public List<Coupon> listCheckoutEligible(Integer userId) {
        if (userId == null) {
            return List.of();
        }
        long prior = countPriorPurchases(userId);
        return couponRepository.findAll().stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()))
                .filter(this::isWithinSchedule)
                .filter(c -> prior >= (long) minimumPriorOrdersOrZero(c))
                .sorted(Comparator.comparing(Coupon::getPriority, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(Coupon::getCode))
                .collect(Collectors.toList());
    }

    public BigDecimal computeDiscountAmount(BigDecimal subtotal, Coupon c) {
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if ("PERCENTAGE".equalsIgnoreCase(c.getDiscountType())) {
            BigDecimal pct = c.getDiscountValue().divide(new BigDecimal("100"), 8, RoundingMode.HALF_UP);
            BigDecimal d = subtotal.multiply(pct).setScale(2, RoundingMode.HALF_UP);
            return d.min(subtotal);
        }
        return subtotal.min(c.getDiscountValue()).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public void incrementUsedCount(String code) {
        if (code == null || code.isBlank()) {
            return;
        }
        couponRepository.findByCode(code.trim()).ifPresent(c -> {
            int used = c.getUsedCount() != null ? c.getUsedCount() : 0;
            c.setUsedCount(used + 1);
            couponRepository.save(c);
        });
    }
}
