package com.fashionstore.core.service;

import com.fashionstore.core.model.Shop;
import com.fashionstore.core.repository.ShopRepository;
import com.fashionstore.core.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;
    private final SubscriptionPlanRepository planRepository;

    @PostConstruct
    public void init() {
        if (shopRepository.count() == 0) {
            planRepository.findAll().stream().findFirst().ifPresent(plan -> {
                shopRepository.save(new Shop(null, "mystore.local", plan, "admin@mystore.local", "My Fashion Store", "ACTIVE"));
                shopRepository.save(new Shop(null, "test-shop.local", plan, "owner@test.local", "Test Tenant Shop", "ACTIVE"));
            });
        }
    }

    public List<Shop> getAllShops() {
        return shopRepository.findAll();
    }

    public Shop createShop(Shop shop) {
        return shopRepository.save(shop);
    }

    public Shop getShopByDomain(String domain) {
        return shopRepository.findByDomain(domain)
                .orElseThrow(() -> new RuntimeException("Shop not found with domain: " + domain));
    }

    public Shop updateShop(Integer id, Shop shopDetails) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        shop.setDomain(shopDetails.getDomain());
        shop.setShopName(shopDetails.getShopName());
        shop.setOwnerEmail(shopDetails.getOwnerEmail());
        shop.setPlan(shopDetails.getPlan());
        shop.setStatus(shopDetails.getStatus());
        return shopRepository.save(shop);
    }

    public Shop updateShopStatus(Integer id, String status) {
        Shop shop = shopRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        shop.setStatus(status);
        return shopRepository.save(shop);
    }
}
