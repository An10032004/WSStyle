package com.fashionstore.core.controller;

import com.fashionstore.core.model.Coupon;
import com.fashionstore.core.repository.CouponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponRepository repository;

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
            // Though user said "Discount", they probably mean Discount Value, keeping Type to not break anything. 
            // Better yet, update properties if they are provided or just update all that the frontend will provide
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
            
            return repository.save(coupon);
        }).orElseThrow(() -> new RuntimeException("Coupon not found"));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        repository.deleteById(id);
    }

    @GetMapping("/validate/{code}")
    public Coupon validate(@PathVariable String code) {
        Coupon coupon = repository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã giảm giá này không tồn tại"));
        
        if (!"ACTIVE".equals(coupon.getStatus())) {
            throw new RuntimeException("Mã giảm giá này hiện đang bị tạm khóa hoặc đã hết hạn");
        }
        
        return coupon;
    }
}
