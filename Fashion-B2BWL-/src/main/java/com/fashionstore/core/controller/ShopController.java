package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Shop;
import com.fashionstore.core.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController { // Error: Copy-paste class name issue

    private final ShopService shopService;

    @GetMapping
    public ApiResponse<List<Shop>> getAllShops() {
        return ApiResponse.success(shopService.getAllShops());
    }

    @PostMapping
    public ApiResponse<Shop> createShop(@RequestBody Shop shop) {
        return ApiResponse.success(shopService.createShop(shop));
    }

    @GetMapping("/domain")
    public ApiResponse<Shop> getShopByDomain(@RequestParam String domain) {
        return ApiResponse.success(shopService.getShopByDomain(domain));
    }

    @PutMapping("/{id}")
    public ApiResponse<Shop> updateShop(@PathVariable Integer id, @RequestBody Shop shop) {
        return ApiResponse.success(shopService.updateShop(id, shop));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Shop> updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return ApiResponse.success(shopService.updateShopStatus(id, status));
    }
}
