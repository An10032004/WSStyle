package com.fashionstore.core.controller;

import com.fashionstore.core.model.ProductReview;
import com.fashionstore.core.repository.ProductReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ProductReviewController {

    @Autowired
    private ProductReviewRepository repository;

    @GetMapping
    public List<ProductReview> getAll() {
        return repository.findAll();
    }

    @GetMapping("/product/{productId}")
    public List<ProductReview> getByProduct(@PathVariable Integer productId) {
        return repository.findByProductId(productId);
    }

    @PostMapping("/{id}/reply")
    public ProductReview reply(@PathVariable Integer id, @RequestBody String message) {
        ProductReview review = repository.findById(id).orElseThrow();
        review.setReplyMessage(message);
        return repository.save(review);
    }
}
