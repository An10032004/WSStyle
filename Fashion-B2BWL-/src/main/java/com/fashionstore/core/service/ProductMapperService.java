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

    public List<ProductResponseDTO> toDTOs(List<Product> products, User user) {
        if (products == null || products.isEmpty()) return new ArrayList<>();

        // Pre-fetch all rules once to avoid massive N+1 queries
        List<HidePriceRule> hidePriceRules = ruleCoreService.getAllActiveHidePriceRules();
        List<SaleCampaign> campaigns = ruleCoreService.getAllActiveSaleCampaigns();
        List<PricingRule> pricingRules = ruleCoreService.getAllActivePricingRules();
        List<TaxDisplayRule> taxRules = ruleCoreService.getAllActiveTaxRules();

        return products.stream()
                .map(p -> toDTO(p, user, hidePriceRules, campaigns, pricingRules, taxRules))
                .toList();
    }

    public ProductResponseDTO toDTO(Product product, User user) {
        return toDTO(product, user, 
            ruleCoreService.getAllActiveHidePriceRules(),
            ruleCoreService.getAllActiveSaleCampaigns(),
            ruleCoreService.getAllActivePricingRules(),
            ruleCoreService.getAllActiveTaxRules()
        );
    }

    public ProductResponseDTO toDTO(Product product, User user, 
                                    List<HidePriceRule> hidePriceRules,
                                    List<SaleCampaign> campaigns,
                                    List<PricingRule> pricingRules,
                                    List<TaxDisplayRule> taxRules) {
        Integer productId = product.getId();
        Integer categoryId = product.getCategoryId();

        ProductResponseDTO dto = ProductResponseDTO.builder()
                .id(product.getId())
                .categoryId(categoryId)
                .productCode(product.getProductCode())
                .name(product.getName())
                .basePrice(product.getBasePrice())
                .calculatedPrice(product.getBasePrice())
                .imageUrl(product.getImageUrl())
                .imageUrls(product.getImageUrls())
                .brand(product.getBrand())
                .material(product.getMaterial())
                .origin(product.getOrigin())
                .hidePrice(false)
                .hideAddToCart(false)
                .build();

        // 1. Apply Hide Price Rules
        ruleCoreService.findBestHidePriceRule(productId, categoryId, user, hidePriceRules).ifPresent(rule -> {
            dto.setHidePrice(rule.getHidePrice());
            dto.setHideAddToCart(rule.getHideAddToCart());
            dto.setReplacementText(rule.getReplacementText());
        });

        // 2. Apply Sale Campaigns
        ruleCoreService.findBestSaleCampaign(productId, categoryId, user, campaigns).ifPresent(campaign -> {
            dto.setCampaignName(campaign.getName());
            dto.setCampaignBanner(campaign.getBannerUrl());
            if (campaign.getDiscountPercentage() != null && campaign.getDiscountPercentage() > 0) {
                BigDecimal factor = BigDecimal.valueOf(100 - campaign.getDiscountPercentage())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                dto.setCalculatedPrice(dto.getCalculatedPrice().multiply(factor));
                dto.setDiscountLabel("Campaign: -" + campaign.getDiscountPercentage() + "%");
            }
        });

        // 3. Apply Pricing Rules
        ruleCoreService.findBestPricingRule(productId, categoryId, user, pricingRules).ifPresent(rule -> {
            if ("QUANTITY_BREAK".equals(rule.getRuleType())) {
                dto.setQuantityBreaksJson(rule.getActionConfig());
                dto.setDiscountLabel("Bulk Discount Available");
            } else {
                BigDecimal price = dto.getCalculatedPrice();
                if ("PERCENTAGE".equals(rule.getDiscountType()) && rule.getDiscountValue() != null) {
                    BigDecimal factor = BigDecimal.valueOf(100).subtract(rule.getDiscountValue())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    dto.setCalculatedPrice(price.multiply(factor));
                } else if (("FIXED".equals(rule.getDiscountType()) || "FIXED_AMOUNT".equals(rule.getDiscountType())) && rule.getDiscountValue() != null) {
                    dto.setCalculatedPrice(price.subtract(rule.getDiscountValue()));
                }
                dto.setDiscountLabel(rule.getName());
            }
        });

        // 4. Apply Tax Display Rules
        ruleCoreService.findBestTaxRule(productId, categoryId, user, taxRules).ifPresent(rule -> {
            dto.setTaxDisplayType(rule.getTaxDisplayType());
            dto.setTaxDisplayLabel(rule.getDisplayType());
        });

        return dto;
    }
}
