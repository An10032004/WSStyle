package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Bundle;
import com.fashionstore.core.service.BundleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bundles")
@RequiredArgsConstructor
public class BundleController {
    private final BundleService bundleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Bundle>>> getAllBundles() {
        return ResponseEntity.ok(ApiResponse.<List<Bundle>>builder()
                .success(true)
                .data(bundleService.getAllBundles())
                .build());
    }

    @GetMapping("/containing-product/{productId}")
    public ResponseEntity<ApiResponse<List<Bundle>>> getBundlesContainingProduct(
            @PathVariable Integer productId) {
        return ResponseEntity.ok(ApiResponse.<List<Bundle>>builder()
                .success(true)
                .data(bundleService.getActiveBundlesContainingProduct(productId))
                .build());
    }

    @GetMapping("/containing-variant/{variantId}")
    public ResponseEntity<ApiResponse<List<Bundle>>> getBundlesContainingVariant(
            @PathVariable Long variantId) {
        return ResponseEntity.ok(ApiResponse.<List<Bundle>>builder()
                .success(true)
                .data(bundleService.getActiveBundlesContainingVariant(variantId))
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Bundle>> getBundleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<Bundle>builder()
                .success(true)
                .data(bundleService.getBundleById(id))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Bundle>> createBundle(@RequestBody Bundle bundle) {
        return ResponseEntity.ok(ApiResponse.<Bundle>builder()
                .success(true)
                .message("Bundle created successfully")
                .data(bundleService.createBundle(bundle))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Bundle>> updateBundle(@PathVariable Long id, @RequestBody Bundle bundle) {
        return ResponseEntity.ok(ApiResponse.<Bundle>builder()
                .success(true)
                .message("Bundle updated successfully")
                .data(bundleService.updateBundle(id, bundle))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBundle(@PathVariable Long id) {
        bundleService.deleteBundle(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Bundle deleted successfully")
                .build());
    }
}
