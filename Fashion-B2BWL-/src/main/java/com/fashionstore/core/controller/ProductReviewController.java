package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.ProductReviewResponseDTO;
import com.fashionstore.core.model.ProductReview;
import com.fashionstore.core.repository.ProductReviewRepository;
import com.fashionstore.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ProductReviewController {

    @Autowired
    private ProductReviewRepository repository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductReviewResponseDTO>>> getAll() {
        List<ProductReviewResponseDTO> dtos = repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<ProductReviewResponseDTO>>> getByProduct(@PathVariable("productId") Integer productId) {
        List<ProductReviewResponseDTO> dtos = repository.findByProductId(productId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    private ProductReviewResponseDTO mapToDTO(ProductReview review) {
        String userName = userRepository.findById(review.getUserId())
                .map(u -> u.getFullName() != null ? u.getFullName() : "Khách hàng #" + u.getId())
                .orElse("Người dùng ẩn danh");

        return ProductReviewResponseDTO.builder()
                .id(review.getId())
                .productId(review.getProductId())
                .userId(review.getUserId())
                .userName(userName)
                .rating(review.getRating())
                .comment(review.getComment())
                .replyMessage(review.getReplyMessage())
                .isPinned(review.getIsPinned())
                .createdAt(review.getCreatedAt())
                .build();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductReview>> create(@RequestBody ProductReview review) {
        if (review.getUserId() == null || review.getProductId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Thiếu thông tin người dùng hoặc sản phẩm"));
        }
        
        return ResponseEntity.ok(ApiResponse.success("Gửi đánh giá thành công", repository.save(review)));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<ApiResponse<ProductReview>> reply(@PathVariable("id") Integer id, @RequestBody String message) {
        ProductReview review = repository.findById(id).orElseThrow();
        review.setReplyMessage(message);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi thành công", repository.save(review)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductReview>> update(@PathVariable("id") Integer id, @RequestBody ProductReview reviewDetails) {
        ProductReview review = repository.findById(id).orElseThrow();
        review.setRating(reviewDetails.getRating());
        review.setComment(reviewDetails.getComment());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đánh giá thành công", repository.save(review)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") Integer id) {
        repository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đánh giá thành công", null));
    }
}
