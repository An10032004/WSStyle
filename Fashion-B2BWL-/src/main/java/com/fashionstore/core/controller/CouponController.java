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

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        repository.deleteById(id);
    }
}
