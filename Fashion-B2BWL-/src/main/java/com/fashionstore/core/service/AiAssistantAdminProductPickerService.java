package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.AiAssistantProductPickerResponse;
import com.fashionstore.core.dto.response.AiAssistantVariantPickerRow;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.repository.ProductVariantRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiAssistantAdminProductPickerService {

    private final ProductService productService;
    private final ProductVariantRepository productVariantRepository;

    /**
     * Phân trang sản phẩm (search theo tên/mã/SKU/variant như {@link ProductSpecification}) và nạp variant
     * theo batch một query — không gọi mapper giá/rule (nhẹ hơn {@code /api/products/search}).
     */
    @Transactional(readOnly = true)
    public Page<AiAssistantProductPickerResponse> searchProductsWithVariants(
            String search, String sortBy, int page, int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "id");
        if ("price-asc".equals(sortBy)) {
            sort = Sort.by(Sort.Direction.ASC, "basePrice");
        } else if ("price-desc".equals(sortBy)) {
            sort = Sort.by(Sort.Direction.DESC, "basePrice");
        }
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Product> productsPage =
                productService.getProductsPaged(search, null, null, null, null, null, pageable);
        if (productsPage.isEmpty()) {
            return Page.empty(pageable);
        }
        List<Integer> productIds =
                productsPage.getContent().stream().map(Product::getId).filter(Objects::nonNull).toList();
        List<ProductVariant> variantRows =
                productIds.isEmpty()
                        ? List.of()
                        : productVariantRepository.findByProductIdInOrderByProductIdAscIdAsc(productIds);
        Map<Integer, List<ProductVariant>> byProductId = variantRows.stream()
                .collect(Collectors.groupingBy(ProductVariant::getProductId, LinkedHashMap::new, Collectors.toList()));

        List<AiAssistantProductPickerResponse> content = new ArrayList<>();
        for (Product p : productsPage.getContent()) {
            Integer pid = p.getId();
            List<ProductVariant> vars = pid == null ? List.of() : byProductId.getOrDefault(pid, List.of());
            String productImg = blankToNull(p.getImageUrl());
            List<AiAssistantVariantPickerRow> vrows = new ArrayList<>();
            for (ProductVariant v : vars) {
                String img = blankToNull(v.getImageUrl());
                if (img == null) {
                    img = productImg;
                }
                vrows.add(AiAssistantVariantPickerRow.builder()
                        .id(v.getId())
                        .sku(v.getSku())
                        .color(v.getColor())
                        .size(v.getSize())
                        .imageUrl(img)
                        .searchTags(v.getSearchTags())
                        .build());
            }
            content.add(AiAssistantProductPickerResponse.builder()
                    .id(pid)
                    .productCode(p.getProductCode())
                    .name(p.getName())
                    .imageUrl(productImg)
                    .variants(vrows)
                    .build());
        }
        return new PageImpl<>(content, productsPage.getPageable(), productsPage.getTotalElements());
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
