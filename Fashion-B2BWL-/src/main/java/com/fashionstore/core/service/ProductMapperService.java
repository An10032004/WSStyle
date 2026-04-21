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

    /** Giá từ biến thể bán được đầu tiên (MIN id), khớp discount/price/adjustment như giỏ hàng; có fallback khi SKU đầu không có giá dương. */
    private record FirstVariantPricing(BigDecimal discountPrice, BigDecimal unitPrice, BigDecimal adjustment) {}

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
        Map<Integer, Integer> totalStock = fetchTotalStockByProductIds(productIds);
        Map<Integer, FirstVariantPricing> primary = fetchFirstVariantPricingByProductIds(productIds);
        Map<Integer, FirstVariantPricing> listingVariantPricing =
                mergeListingVariantPricingForProducts(products, variantCounts, primary);

        return products.stream()
                .map(p -> toDTO(p, user, hidePriceRules, campaigns, pricingRules, taxRules, netTermRules, variantCounts,
                        listingVariantPricing, totalStock))
                .toList();
    }

    public Page<ProductResponseDTO> toDTOs(Page<Product> productsPage, User user) {
        if (productsPage == null || productsPage.isEmpty()) return Page.empty();

        List<HidePriceRule> hidePriceRules = ruleCoreService.getAllActiveHidePriceRules();
        List<SaleCampaign> campaigns = ruleCoreService.getAllActiveSaleCampaigns();
        List<PricingRule> pricingRules = ruleCoreService.getAllActivePricingRules();
        List<TaxDisplayRule> taxRules = ruleCoreService.getAllActiveTaxRules();
        List<NetTermRule> netTermRules = ruleCoreService.getAllActiveNetTermRules();

        List<Product> pageProducts = productsPage.getContent();
        List<Integer> productIds = pageProducts.stream().map(Product::getId).filter(Objects::nonNull).toList();
        Map<Integer, Integer> variantCounts = fetchVariantCountsByProductIds(productIds);
        Map<Integer, Integer> totalStock = fetchTotalStockByProductIds(productIds);
        Map<Integer, FirstVariantPricing> primary = fetchFirstVariantPricingByProductIds(productIds);
        Map<Integer, FirstVariantPricing> listingVariantPricing =
                mergeListingVariantPricingForProducts(pageProducts, variantCounts, primary);

        List<ProductResponseDTO> dtos = pageProducts.stream()
                .map(p -> toDTO(p, user, hidePriceRules, campaigns, pricingRules, taxRules, netTermRules, variantCounts,
                        listingVariantPricing, totalStock))
                .toList();

        return new PageImpl<>(dtos, productsPage.getPageable(), productsPage.getTotalElements());
    }

    public ProductResponseDTO toDTO(Product product, User user) {
        List<Integer> pids = product.getId() == null ? List.of() : List.of(product.getId());
        Map<Integer, Integer> variantCounts = fetchVariantCountsByProductIds(pids);
        Map<Integer, Integer> totalStock = fetchTotalStockByProductIds(pids);
        Map<Integer, FirstVariantPricing> primary = fetchFirstVariantPricingByProductIds(pids);
        Map<Integer, FirstVariantPricing> listingVariantPricing =
                mergeListingVariantPricingForProducts(List.of(product), variantCounts, primary);
        return toDTO(product, user,
            ruleCoreService.getAllActiveHidePriceRules(),
            ruleCoreService.getAllActiveSaleCampaigns(),
            ruleCoreService.getAllActivePricingRules(),
            ruleCoreService.getAllActiveTaxRules(),
            ruleCoreService.getAllActiveNetTermRules(),
            variantCounts,
            listingVariantPricing,
            totalStock
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

    private Map<Integer, Integer> fetchTotalStockByProductIds(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = productVariantRepository.sumSellableStockByProductIds(productIds);
        Map<Integer, Integer> out = new HashMap<>();
        if (rows == null) {
            return out;
        }
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            out.put(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
        }
        return out;
    }

    private Map<Integer, FirstVariantPricing> fetchFirstVariantPricingByProductIds(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = productVariantRepository.findFirstSellableVariantPricingByProductIds(productIds);
        return rowsToVariantPricingMap(rows);
    }

    private static Map<Integer, FirstVariantPricing> rowsToVariantPricingMap(List<Object[]> rows) {
        Map<Integer, FirstVariantPricing> out = new HashMap<>();
        if (rows == null) {
            return out;
        }
        for (Object[] row : rows) {
            if (row == null || row.length < 4 || row[0] == null) {
                continue;
            }
            int pid = ((Number) row[0]).intValue();
            out.put(pid, new FirstVariantPricing(toBigDecimal(row[1]), toBigDecimal(row[2]), toBigDecimal(row[3])));
        }
        return out;
    }

    /**
     * Nếu biến thể MIN(id) không cho giá niêm yết &gt; 0 nhưng vẫn có SKU: thay bằng biến thể MIN(id) trong tập «có giá dương»
     * (tránh 0 đ trên shop khi base sản phẩm = 0 hoặc SKU đầu không gán price).
     */
    private Map<Integer, FirstVariantPricing> mergeListingVariantPricingForProducts(
            List<Product> products,
            Map<Integer, Integer> variantCounts,
            Map<Integer, FirstVariantPricing> primary) {
        Map<Integer, FirstVariantPricing> out = new HashMap<>(primary != null ? primary : Map.of());
        if (products == null || products.isEmpty()) {
            return out;
        }
        List<Integer> badIds = new ArrayList<>();
        for (Product p : products) {
            Integer id = p.getId();
            if (id == null) {
                continue;
            }
            int vc = variantCounts == null ? 0 : variantCounts.getOrDefault(id, 0);
            if (vc <= 0) {
                continue;
            }
            BigDecimal pb = Optional.ofNullable(p.getBasePrice()).orElse(BigDecimal.ZERO);
            FirstVariantPricing fp = out.get(id);
            BigDecimal anchor = resolveListingAnchor(pb, fp);
            if (anchor.compareTo(BigDecimal.ZERO) <= 0) {
                badIds.add(id);
            }
        }
        if (badIds.isEmpty()) {
            return out;
        }
        List<Object[]> rows = productVariantRepository.findFirstSellableVariantWithPositiveListPriceByProductIds(badIds);
        Map<Integer, FirstVariantPricing> secondary = rowsToVariantPricingMap(rows);
        for (Integer bid : badIds) {
            FirstVariantPricing fp2 = secondary.get(bid);
            if (fp2 != null) {
                out.put(bid, fp2);
            }
        }
        return out;
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof BigDecimal b) {
            return b;
        }
        if (o instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        try {
            return new BigDecimal(o.toString());
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Giá niêm yết trên grid: ưu tiên discount_price &gt; 0, sau đó price &gt; 0, không thì base sản phẩm + price_adjustment
     * (cùng thứ tự ưu tiên như FE khi thêm giỏ với biến thể).
     */
    private static BigDecimal resolveListingAnchor(BigDecimal productBase, FirstVariantPricing fp) {
        if (fp == null) {
            return productBase;
        }
        if (fp.discountPrice() != null && fp.discountPrice().compareTo(BigDecimal.ZERO) > 0) {
            return fp.discountPrice().setScale(0, RoundingMode.HALF_UP);
        }
        if (fp.unitPrice() != null && fp.unitPrice().compareTo(BigDecimal.ZERO) > 0) {
            return fp.unitPrice().setScale(0, RoundingMode.HALF_UP);
        }
        BigDecimal adj = fp.adjustment() != null ? fp.adjustment() : BigDecimal.ZERO;
        return productBase.add(adj).setScale(0, RoundingMode.HALF_UP);
    }

    public ProductResponseDTO toDTO(Product product, User user,
                                    List<HidePriceRule> hidePriceRules,
                                    List<SaleCampaign> campaigns,
                                    List<PricingRule> pricingRules,
                                    List<TaxDisplayRule> taxRules,
                                    List<NetTermRule> netTermRules,
                                    Map<Integer, Integer> variantCountsByProductId,
                                    Map<Integer, FirstVariantPricing> firstVariantPricingByProductId,
                                    Map<Integer, Integer> totalStockByProductId) {
        Integer productId = product.getId();
        Integer categoryId = product.getCategoryId();
        int variantCount = variantCountsByProductId == null || productId == null
                ? 0
                : variantCountsByProductId.getOrDefault(productId, 0);
        int totalStock = totalStockByProductId == null || productId == null
                ? 0
                : totalStockByProductId.getOrDefault(productId, 0);

        BigDecimal productBase = Optional.ofNullable(product.getBasePrice()).orElse(BigDecimal.ZERO);
        FirstVariantPricing fp = firstVariantPricingByProductId == null || productId == null
                ? null
                : firstVariantPricingByProductId.get(productId);
        BigDecimal listAnchor = resolveListingAnchor(productBase, fp);

        ProductResponseDTO dto = ProductResponseDTO.builder()
                .id(product.getId())
                .categoryId(categoryId)
                .productCode(product.getProductCode())
                .name(product.getName())
                .basePrice(listAnchor)
                .calculatedPrice(listAnchor)
                .imageUrl(product.getImageUrl())
                .imageUrls(product.getImageUrls())
                .brand(product.getBrand())
                .material(product.getMaterial())
                .origin(product.getOrigin())
                .variantDimensionLabels(product.getVariantDimensionLabels())
                .variantCount(variantCount)
                .totalStock(totalStock)
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
