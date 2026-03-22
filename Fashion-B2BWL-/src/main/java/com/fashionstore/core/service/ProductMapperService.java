package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductMapperService {

    private final RuleCoreService ruleCoreService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProductResponseDTO toDTO(Product product, User user) {
        Integer productId = product.getId();
        Integer categoryId = product.getCategory() != null ? product.getCategory().getId() : null;

        ProductResponseDTO dto = ProductResponseDTO.builder()
                .id(product.getId())
                .productCode(product.getProductCode())
                .name(product.getName())
                .basePrice(product.getBasePrice())
                .calculatedPrice(product.getBasePrice())
                .imageUrl(product.getImageUrl())
                .imageUrls(parseImageUrls(product.getImageUrls()))
                .brand(product.getBrand())
                .specifications(product.getSpecifications())
                .hidePrice(false)
                .hideAddToCart(false)
                .build();

        // 1. Apply Hide Price Rules (Check if price should be hidden)
        ruleCoreService.findBestHidePriceRule(productId, categoryId, user).ifPresent(rule -> {
            dto.setHidePrice(rule.getHidePrice());
            dto.setHideAddToCart(rule.getHideAddToCart());
            dto.setReplacementText(rule.getReplacementText());
        });

        // 2. Apply Sale Campaigns (Dynamic discounts)
        ruleCoreService.findBestSaleCampaign(productId, categoryId, user).ifPresent(campaign -> {
            dto.setCampaignName(campaign.getName());
            dto.setCampaignBanner(campaign.getBannerUrl());
            if (campaign.getDiscountPercentage() != null && campaign.getDiscountPercentage() > 0) {
                BigDecimal factor = BigDecimal.valueOf(100 - campaign.getDiscountPercentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                dto.setCalculatedPrice(dto.getCalculatedPrice().multiply(factor));
                dto.setDiscountLabel("Campaign: -" + campaign.getDiscountPercentage() + "%");
            }
        });

        // 3. Apply Pricing Rules (B2B, Specific discounts etc.)
        ruleCoreService.findBestPricingRule(productId, categoryId, user).ifPresent(rule -> {
            BigDecimal price = dto.getCalculatedPrice();
            if ("PERCENTAGE".equals(rule.getDiscountType()) && rule.getDiscountValue() != null) {
                BigDecimal factor = BigDecimal.valueOf(100).subtract(rule.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                dto.setCalculatedPrice(price.multiply(factor));
            } else if (("FIXED".equals(rule.getDiscountType()) || "FIXED_AMOUNT".equals(rule.getDiscountType())) && rule.getDiscountValue() != null) {
                dto.setCalculatedPrice(price.subtract(rule.getDiscountValue()));
            }
            
            // Override discount label if pricing rule is better
            dto.setDiscountLabel(rule.getName());
        });

        // 4. Apply Tax Display Rules
        ruleCoreService.findBestTaxRule(productId, categoryId, user).ifPresent(rule -> {
            dto.setTaxDisplayType(rule.getTaxDisplayType());
            dto.setTaxDisplayLabel(rule.getDisplayType());
        });

        return dto;
    }

    private List<String> parseImageUrls(String json) {
        if (json == null || json.isEmpty()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
