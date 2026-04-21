package com.fashionstore.core.repository.specification;

import com.fashionstore.core.model.Product;
import com.fashionstore.core.model.ProductVariant;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filterProducts(
            String search,
            List<Integer> categoryIds,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            List<String> brands,
            List<Integer> productIds) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                if (query != null) {
                    query.distinct(true);
                }
                String searchPattern = "%" + search.toLowerCase().trim() + "%";
                Predicate nameMatch = criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), searchPattern);
                Predicate codeMatch = criteriaBuilder.like(criteriaBuilder.lower(root.get("productCode")), searchPattern);
                Join<Product, ProductVariant> variants = root.join("variants", JoinType.LEFT);
                Predicate colorMatch = criteriaBuilder.like(criteriaBuilder.lower(variants.get("color")), searchPattern);
                Predicate sizeMatch = criteriaBuilder.like(criteriaBuilder.lower(variants.get("size")), searchPattern);
                Predicate weightMatch = criteriaBuilder.like(criteriaBuilder.lower(variants.get("weight")), searchPattern);
                Predicate skuMatch = criteriaBuilder.like(criteriaBuilder.lower(variants.get("sku")), searchPattern);
                predicates.add(criteriaBuilder.or(nameMatch, codeMatch, colorMatch, sizeMatch, weightMatch, skuMatch));
            }

            if (categoryIds != null && !categoryIds.isEmpty()) {
                predicates.add(root.get("category").get("id").in(categoryIds));
            }

            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("basePrice"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("basePrice"), maxPrice));
            }

            if (brands != null && !brands.isEmpty()) {
                predicates.add(root.get("brand").in(brands));
            }

            if (productIds != null && !productIds.isEmpty()) {
                predicates.add(root.get("id").in(productIds));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
