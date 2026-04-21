package com.fashionstore.core.controller;

import com.fashionstore.core.model.Coupon;
import com.fashionstore.core.repository.CouponRepository;
import com.fashionstore.core.service.CouponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponRepository repository;

    @Autowired
    private CouponService couponService;

    @GetMapping
    public List<Coupon> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Coupon create(@RequestBody Coupon coupon) {
        return repository.save(coupon);
    }

    @PutMapping("/{id}")
    public Coupon update(@PathVariable Integer id, @RequestBody Coupon updatedCoupon) {
        return repository.findById(id).map(coupon -> {
            coupon.setCode(updatedCoupon.getCode());
            if (updatedCoupon.getDiscountType() != null) {
                coupon.setDiscountType(updatedCoupon.getDiscountType());
            }
            if (updatedCoupon.getDiscountValue() != null) {
                coupon.setDiscountValue(updatedCoupon.getDiscountValue());
            }
            if (updatedCoupon.getStatus() != null) {
                coupon.setStatus(updatedCoupon.getStatus());
            }
            coupon.setStartDate(updatedCoupon.getStartDate());
            coupon.setEndDate(updatedCoupon.getEndDate());
            coupon.setMinimumPriorOrders(updatedCoupon.getMinimumPriorOrders());
            if (updatedCoupon.getPriority() != null) {
                coupon.setPriority(updatedCoupon.getPriority());
            }
            return repository.save(coupon);
        }).orElseThrow(() -> new RuntimeException("Coupon not found"));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        repository.deleteById(id);
    }

    /**
     * Kiểm tra mã (lịch, trạng thái, số đơn đã mua tối thiểu).
     */
    @GetMapping("/validate/{code}")
    public Coupon validate(
            @PathVariable String code,
            @RequestParam(required = false) Integer userId) {
        return couponService.validateForCheckout(code, userId);
    }

    /** Mã hiển thị ở giỏ/checkout (đã lọc theo user + số đơn đã mua). */
    @GetMapping("/checkout-eligible")
    public List<Coupon> checkoutEligible(@RequestParam Integer userId) {
        return couponService.listCheckoutEligible(userId);
    }
}
