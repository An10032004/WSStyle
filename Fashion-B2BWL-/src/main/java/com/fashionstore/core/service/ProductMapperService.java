package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.fashionstore.core.repository.ProductVariantRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

@Service
@RequiredArgsConstructor
public class ProductMapperService {

    private final RuleCoreService ruleCoreService;
    private final ProductVariantRepository productVariantRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ProductResponseDTO> toDTOs(List<Product> products, User user) {
        if (products == null || products.isEmpty()) return new ArrayList<>();

        // Pre-fetch all rules once to avoid massive N+1 queries
        List<HidePriceRule> hidePriceRules = ruleCoreService.getAllActiveHidePriceRules();
        List<SaleCampaign> campaigns = ruleCoreService.getAllActiveSaleCampaigns();
        List<PricingRule> pricingRules = ruleCoreService.getAllActivePricingRules();
        List<TaxDisplayRule> taxRules = ruleCoreService.getAllActiveTaxRules();
        List<NetTermRule> netTermRules = ruleCoreService.getAllActiveNetTermRules();

        List<Integer> productIds = products.stream().map(Product::getId).filter(Objects::nonNull).toList();
        Map<Integer, Integer> variantCounts = fetchVariantCountsByProductIds(productIds);

        return products.stream()
                .map(p -> toDTO(p, user, hidePriceRules, campaigns, pricingRules, taxRules, netTermRules, variantCounts))
                .toList();
    }

    public Page<ProductResponseDTO> toDTOs(Page<Product> productsPage, User user) {
        if (productsPage == null || productsPage.isEmpty()) return Page.empty();

        List<HidePriceRule> hidePriceRules = ruleCoreService.getAllActiveHidePriceRules();
        List<SaleCampaign> campaigns = ruleCoreService.getAllActiveSaleCampaigns();
        List<PricingRule> pricingRules = ruleCoreService.getAllActivePricingRules();
        List<TaxDisplayRule> taxRules = ruleCoreService.getAllActiveTaxRules();
        List<NetTermRule> netTermRules = ruleCoreService.getAllActiveNetTermRules();

        List<Integer> productIds = productsPage.getContent().stream().map(Product::getId).filter(Objects::nonNull).toList();
        Map<Integer, Integer> variantCounts = fetchVariantCountsByProductIds(productIds);

        List<ProductResponseDTO> dtos = productsPage.getContent().stream()
                .map(p -> toDTO(p, user, hidePriceRules, campaigns, pricingRules, taxRules, netTermRules, variantCounts))
                .toList();

        return new PageImpl<>(dtos, productsPage.getPageable(), productsPage.getTotalElements());
    }

    public ProductResponseDTO toDTO(Product product, User user) {
        Map<Integer, Integer> variantCounts = fetchVariantCountsByProductIds(
                product.getId() == null ? List.of() : List.of(product.getId()));
        return toDTO(product, user,
            ruleCoreService.getAllActiveHidePriceRules(),
            ruleCoreService.getAllActiveSaleCampaigns(),
            ruleCoreService.getAllActivePricingRules(),
            ruleCoreService.getAllActiveTaxRules(),
            ruleCoreService.getAllActiveNetTermRules(),
            variantCounts
        );
    }

    private Map<Integer, Integer> fetchVariantCountsByProductIds(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = productVariantRepository.countByProductIdGrouped(productIds);
        Map<Integer, Integer> out = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null && row[1] != null) {
                out.put(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            }
        }
        return out;
    }

    public ProductResponseDTO toDTO(Product product, User user,
                                    List<HidePriceRule> hidePriceRules,
                                    List<SaleCampaign> campaigns,
                                    List<PricingRule> pricingRules,
                                    List<TaxDisplayRule> taxRules,
                                    List<NetTermRule> netTermRules,
                                    Map<Integer, Integer> variantCountsByProductId) {
        Integer productId = product.getId();
        Integer categoryId = product.getCategoryId();
        int variantCount = variantCountsByProductId == null || productId == null
                ? 0
                : variantCountsByProductId.getOrDefault(productId, 0);

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
                .variantDimensionLabels(product.getVariantDimensionLabels())
                .variantCount(variantCount)
                .hidePrice(false)
                .hideAddToCart(false)
                .isNetTermEligible(false)
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
        // First, find the best matching Quantity Break rule for UI discovery
        pricingRules.stream()
                .filter(r -> "QUANTITY_BREAK".equals(r.getRuleType()))
                .filter(r -> ruleCoreService.isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user))
                .filter(r -> ruleCoreService.isProductMatch(r.getApplyProductType(), r.getApplyProductValue(), productId, categoryId))
                .min((r1, r2) -> (r1.getPriority() != null ? r1.getPriority() : 999) - (r2.getPriority() != null ? r2.getPriority() : 999))
                .ifPresent(qbRule -> {
                    dto.setQuantityBreaksJson(qbRule.getActionConfig());
                });

        // Apply best pricing rule (Lowest priority wins)
        ruleCoreService.findBestPricingRule(productId, categoryId, user, pricingRules).ifPresent(rule -> {
            if ("QUANTITY_BREAK".equals(rule.getRuleType())) {
                dto.setDiscountLabel("Ưu đãi mua sỉ");
            } else {
                BigDecimal price = dto.getCalculatedPrice();
                if ("PERCENTAGE".equals(rule.getDiscountType()) && rule.getDiscountValue() != null) {
                    BigDecimal factor = BigDecimal.valueOf(100).subtract(rule.getDiscountValue())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    dto.setCalculatedPrice(price.multiply(factor).setScale(0, RoundingMode.HALF_UP));
                } else if (("FIXED".equals(rule.getDiscountType()) || "FIXED_AMOUNT".equals(rule.getDiscountType())) && rule.getDiscountValue() != null) {
                    dto.setCalculatedPrice(price.subtract(rule.getDiscountValue()).setScale(0, RoundingMode.HALF_UP));
                }
                dto.setDiscountLabel(rule.getName());
            }
        });

        // 4. Apply Tax Display Rules
        ruleCoreService.findBestTaxRule(productId, categoryId, user, taxRules).ifPresent(rule -> {
            dto.setTaxDisplayType(rule.getTaxDisplayType());
            dto.setTaxDisplayLabel(rule.getDisplayType());

            // Apply Tax-related Discount Rate if any
            if (rule.getDiscountRate() != null && rule.getDiscountRate() > 0) {
                BigDecimal factor = BigDecimal.valueOf(100 - rule.getDiscountRate())
                        .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                dto.setCalculatedPrice(dto.getCalculatedPrice().multiply(factor).setScale(0, RoundingMode.HALF_UP));
                
                String discountMsg = "Tax Promo: -" + rule.getDiscountRate() + "%";
                dto.setDiscountLabel(dto.getDiscountLabel() == null ? discountMsg : dto.getDiscountLabel() + " | " + discountMsg);
            }

            // Calculate Tax-Exclusive Price (Assuming base is tax-inclusive)
            // priceExcl = calculated / 1.1 (for 10% tax)
            BigDecimal taxFactor = BigDecimal.valueOf(1.1);
            BigDecimal priceExcl = dto.getCalculatedPrice().divide(taxFactor, 0, RoundingMode.HALF_UP);
            dto.setPriceExclTax(priceExcl);
            dto.setTaxAmount(dto.getCalculatedPrice().subtract(priceExcl));
        });

        // 5. Apply NET Term Rules
        ruleCoreService.findBestNetTermRule(user, netTermRules).ifPresent(rule -> {
            dto.setIsNetTermEligible(true);
            dto.setNetTermDays(rule.getNetTermDays());
        });

        return dto;
    }
}
