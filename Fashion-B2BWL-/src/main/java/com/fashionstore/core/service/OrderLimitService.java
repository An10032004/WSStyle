package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.OrderLimitRequest;
import com.fashionstore.core.model.OrderLimit;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.OrderLimitRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderLimitService {

    private final OrderLimitRepository orderLimitRepository;
    private final RuleCoreService ruleCoreService;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItemDTO {
        private Integer productId;
        private Integer categoryId;
        /** Nullable: khi có, quy tắc PER_VARIANT gộp theo biến thể. */
        private Integer variantId;
        private Integer quantity;
        private BigDecimal price;
    }

    @Data
    @AllArgsConstructor
    public static class ValidationResult {
        private String ruleName;
        private boolean success;
        private String message;
    }

    public List<OrderLimit> getAllRules() {
        return orderLimitRepository.findAll();
    }

    public OrderLimit getRuleById(Integer id) {
        return orderLimitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order limit rule not found with id: " + id));
    }

    @Transactional
    public OrderLimit createRule(OrderLimitRequest request) {
        assertUniquePriority(request.getPriority(), null);
        OrderLimit rule = OrderLimit.builder()
                .name(request.getName())
                .priority(request.getPriority())
                .status(request.getStatus())
                .limitLevel(request.getLimitLevel())
                .limitType(request.getLimitType())
                .applyCustomerType(request.getApplyCustomerType())
                .applyCustomerValue(request.getApplyCustomerValue())
                .excludeCustomerOption(request.getExcludeCustomerOption())
                .excludeCustomerValue(request.getExcludeCustomerValue())
                .applyProductType(request.getApplyProductType())
                .applyProductValue(request.getApplyProductValue())
                .excludeProductOption(request.getExcludeProductOption())
                .excludeProductValue(request.getExcludeProductValue())
                .limitValue(request.getLimitValue())
                .build();
        return orderLimitRepository.save(rule);
    }

    @Transactional
    public OrderLimit updateRule(Integer id, OrderLimitRequest request) {
        assertUniquePriority(request.getPriority(), id);
        OrderLimit rule = getRuleById(id);
        rule.setName(request.getName());
        rule.setPriority(request.getPriority());
        rule.setStatus(request.getStatus());
        rule.setLimitLevel(request.getLimitLevel());
        rule.setLimitType(request.getLimitType());
        rule.setApplyCustomerType(request.getApplyCustomerType());
        rule.setApplyCustomerValue(request.getApplyCustomerValue());
        rule.setExcludeCustomerOption(request.getExcludeCustomerOption());
        rule.setExcludeCustomerValue(request.getExcludeCustomerValue());
        rule.setApplyProductType(request.getApplyProductType());
        rule.setApplyProductValue(request.getApplyProductValue());
        rule.setExcludeProductOption(request.getExcludeProductOption());
        rule.setExcludeProductValue(request.getExcludeProductValue());
        rule.setLimitValue(request.getLimitValue());
        return orderLimitRepository.save(rule);
    }

    @Transactional
    public void deleteRule(Integer id) {
        orderLimitRepository.deleteById(id);
    }

    /**
     * Khóa "trục" giới hạn (không gồm MIN/MAX trong key):
     * cùng (QTY hoặc AMT) × (PER_ORDER / PER_PRODUCT / …) × cùng targeting KH &amp; SP.
     * <p>
     * Trong mỗi nhóm: lấy tầng priority <strong>nhỏ nhất</strong> (ưu tiên cao nhất). Trên tầng đó có thể
     * giữ tối đa một rule MIN và một rule MAX (số lượng / giá trị). Các rule cùng loại MIN hoặc cùng MAX
     * trên tầng đó → chọn rule có id nhỏ hơn. Các rule priority lớn hơn trong nhóm bị bỏ qua.
     * <p>
     * Trước đây limitType nằm trong key nên MIN và MAX luôn cùng áp dụng dù priority lệch nhau.
     * <p>
     * Sau {@link #resolveWinningRules}, {@link #dedupeOverlappingByPriority} loại các quy tắc trùng phạm vi
     * KH+SP với quy tắc đã chọn (giống một quy tắc thắng trên bảng giá / chiết khấu).
     */
    private String orderLimitPrecedenceKey(OrderLimit r) {
        String level = r.getLimitLevel() != null ? r.getLimitLevel() : "PER_ORDER";
        String lt = r.getLimitType();
        if (isMinQuantityType(lt) || isMaxQuantityType(lt)) {
            return precedenceKeyCore("QTY", level, r);
        }
        if (isMinValueType(lt) || isMaxAmountType(lt)) {
            return precedenceKeyCore("AMT", level, r);
        }
        return String.join("\u0001",
                "UNK",
                String.valueOf(lt),
                level,
                normCustType(r),
                String.valueOf(r.getApplyCustomerValue()),
                normProdType(r),
                String.valueOf(r.getApplyProductValue()));
    }

    /** Đồng bộ với RuleCoreService.ruleTargetFromOrderLimit / isCustomerMatch: null coi như ALL. */
    private String normCustType(OrderLimit r) {
        String t = r.getApplyCustomerType();
        return (t == null || t.isEmpty()) ? "ALL" : t;
    }

    private String normProdType(OrderLimit r) {
        String t = r.getApplyProductType();
        return (t == null || t.isEmpty()) ? "ALL" : t;
    }

    private String precedenceKeyCore(String axis, String level, OrderLimit r) {
        return String.join("\u0001",
                axis,
                level,
                normCustType(r),
                String.valueOf(r.getApplyCustomerValue()),
                normProdType(r),
                String.valueOf(r.getApplyProductValue()));
    }

    private boolean isMinQuantityType(String limitType) {
        return "MIN_ORDER_QTY".equals(limitType) || "MIN_ORDER_QUANTITY".equals(limitType);
    }

    private boolean isMinValueType(String limitType) {
        return "MIN_ORDER_VALUE".equals(limitType) || "MIN_ORDER_AMOUNT".equals(limitType);
    }

    private boolean isMaxAmountType(String limitType) {
        return "MAX_ORDER_AMOUNT".equals(limitType);
    }

    private boolean isMaxQuantityType(String limitType) {
        return "MAX_ORDER_QTY".equals(limitType) || "MAX_ORDER_QUANTITY".equals(limitType);
    }

    private boolean isPerOrderLevel(String limitLevel) {
        return "PER_ORDER".equals(limitLevel);
    }

    private boolean isPerLineLevel(String limitLevel) {
        return "PER_PRODUCT".equals(limitLevel) || "PER_VARIANT".equals(limitLevel);
    }

    private String formatMoney(BigDecimal v) {
        return v.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }

    private static final Comparator<OrderLimit> RULE_PRECEDENCE_ORDER =
            Comparator.comparing(OrderLimit::getPriority, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(OrderLimit::getId, Comparator.nullsLast(Integer::compareTo));

    /**
     * Gom theo {@link #orderLimitPrecedenceKey}, chỉ giữ tầng priority tốt nhất; trên tầng đó tối đa
     * một MIN_QTY, một MAX_QTY, một MIN_AMOUNT, một MAX_AMOUNT (theo thứ tự sort id nếu trùng loại).
     */
    private List<OrderLimit> resolveWinningRules(User user, List<OrderLimit> activeRules) {
        Map<String, List<OrderLimit>> byKey = new LinkedHashMap<>();
        for (OrderLimit r : activeRules) {
            if (!ruleCoreService.isCustomerMatch(r.getApplyCustomerType(), r.getApplyCustomerValue(), user)) {
                continue;
            }
            byKey.computeIfAbsent(orderLimitPrecedenceKey(r), k -> new ArrayList<>()).add(r);
        }

        List<OrderLimit> winners = new ArrayList<>();
        for (List<OrderLimit> group : byKey.values()) {
            group.sort(RULE_PRECEDENCE_ORDER);
            Integer bestPrio = group.get(0).getPriority();
            List<OrderLimit> tier = new ArrayList<>();
            for (OrderLimit r : group) {
                if (Objects.equals(r.getPriority(), bestPrio)) {
                    tier.add(r);
                } else {
                    break;
                }
            }
            tier.sort(RULE_PRECEDENCE_ORDER);
            String lt0 = tier.get(0).getLimitType();
            boolean knownQtyOrAmt = isMinQuantityType(lt0) || isMaxQuantityType(lt0)
                    || isMinValueType(lt0) || isMaxAmountType(lt0);
            if (!knownQtyOrAmt) {
                winners.add(tier.get(0));
                continue;
            }
            addIfPresent(winners, pickFirstMatching(tier, this::isMinQuantityType));
            addIfPresent(winners, pickFirstMatching(tier, this::isMaxQuantityType));
            addIfPresent(winners, pickFirstMatching(tier, this::isMinValueType));
            addIfPresent(winners, pickFirstMatching(tier, this::isMaxAmountType));
        }
        return winners;
    }

    private static void addIfPresent(List<OrderLimit> list, OrderLimit r) {
        if (r != null) {
            list.add(r);
        }
    }

    private static OrderLimit pickFirstMatching(List<OrderLimit> tier, Predicate<String> limitTypeOk) {
        return tier.stream()
                .filter(r -> limitTypeOk.test(r.getLimitType()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Cùng "nhóm cạnh tranh" khi hai quy tắc cùng cấp (PER_ORDER / PER_LINE) và cùng trục (QTY hoặc AMOUNT)
     * và cùng hướng (MIN vs MIN hoặc MAX vs MAX). MIN và MAX không loại lẫn nhau.
     */
    /**
     * Chuẩn hóa cấp độ dòng: PER_PRODUCT và PER_VARIANT cùng nhóm cạnh tranh (một MAX/MIN dòng thắng),
     * tránh hai quy tắc "dòng" khác tên cấp nhưng cùng áp dụng một dòng giỏ.
     */
    private String exclusiveLimitLevelBucket(OrderLimit r) {
        String l = r.getLimitLevel() != null ? r.getLimitLevel() : "PER_ORDER";
        if (isPerLineLevel(l)) {
            return "PER_LINE";
        }
        return l;
    }

    private boolean sameExclusiveCompetitionBucket(OrderLimit a, OrderLimit b) {
        String la = exclusiveLimitLevelBucket(a);
        String lb = exclusiveLimitLevelBucket(b);
        if (!la.equals(lb)) {
            return false;
        }
        String ta = a.getLimitType();
        String tb = b.getLimitType();
        boolean qtyA = isMinQuantityType(ta) || isMaxQuantityType(ta);
        boolean qtyB = isMinQuantityType(tb) || isMaxQuantityType(tb);
        boolean amtA = isMinValueType(ta) || isMaxAmountType(ta);
        boolean amtB = isMinValueType(tb) || isMaxAmountType(tb);
        if (qtyA && qtyB) {
            return isMinQuantityType(ta) == isMinQuantityType(tb);
        }
        if (amtA && amtB) {
            return isMinValueType(ta) == isMinValueType(tb);
        }
        return false;
    }

    /**
     * Giống findBestPricingRule: đã sort priority tăng dần; nếu quy tắc sau overlap KH+SP với quy tắc đã giữ
     * và cùng bucket cạnh tranh thì bỏ (chỉ giữ priority nhỏ nhất).
     */
    private List<OrderLimit> dedupeOverlappingByPriority(List<OrderLimit> rules) {
        List<OrderLimit> sorted = new ArrayList<>(rules);
        sorted.sort(RULE_PRECEDENCE_ORDER);
        List<OrderLimit> out = new ArrayList<>();
        for (OrderLimit r : sorted) {
            boolean skip = false;
            for (OrderLimit w : out) {
                if (sameExclusiveCompetitionBucket(w, r) && ruleCoreService.orderLimitTargetingOverlaps(w, r)) {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                out.add(r);
            }
        }
        return out;
    }

    /** Gộp dòng giỏ theo sản phẩm (PER_PRODUCT) hoặc biến thể (PER_VARIANT, fallback theo SP nếu thiếu variantId). */
    private String aggregateKeyPerLine(CartItemDTO line, String limitLevel) {
        if ("PER_VARIANT".equals(limitLevel) && line.getVariantId() != null) {
            return "V:" + line.getVariantId();
        }
        return "P:" + line.getProductId();
    }

    private void validateAggregatedLineQuantities(
            List<CartItemDTO> targetItems,
            String limitLevel,
            int bound,
            boolean min,
            OrderLimit rule,
            List<ValidationResult> results) {
        Map<String, Integer> qtyByKey = new LinkedHashMap<>();
        Map<String, Integer> sampleProductId = new LinkedHashMap<>();
        for (CartItemDTO line : targetItems) {
            String k = aggregateKeyPerLine(line, limitLevel);
            qtyByKey.merge(k, line.getQuantity(), Integer::sum);
            sampleProductId.putIfAbsent(k, line.getProductId());
        }
        for (Map.Entry<String, Integer> e : qtyByKey.entrySet()) {
            int q = e.getValue();
            boolean fail = min ? q < bound : q > bound;
            if (!fail) {
                continue;
            }
            String key = e.getKey();
            Integer pid = sampleProductId.get(key);
            String scope = key.startsWith("V:") ? ("biến thể ID " + key.substring(2)) : ("sản phẩm ID " + pid);
            if (min) {
                results.add(new ValidationResult(rule.getName(), false,
                        "Tổng số lượng theo " + scope + " trong giỏ là " + q
                                + ", chưa đạt tối thiểu " + bound + " (quy tắc \"" + rule.getName() + "\")."));
            } else {
                results.add(new ValidationResult(rule.getName(), false,
                        "Tổng số lượng theo " + scope + " trong giỏ là " + q
                                + ", vượt tối đa " + bound + " (quy tắc \"" + rule.getName() + "\")."));
            }
        }
    }

    private void validateAggregatedLineValues(
            List<CartItemDTO> targetItems,
            String limitLevel,
            BigDecimal bound,
            boolean min,
            OrderLimit rule,
            List<ValidationResult> results) {
        Map<String, BigDecimal> valByKey = new LinkedHashMap<>();
        Map<String, Integer> sampleProductId = new LinkedHashMap<>();
        for (CartItemDTO line : targetItems) {
            String k = aggregateKeyPerLine(line, limitLevel);
            BigDecimal lineVal = line.getPrice().multiply(BigDecimal.valueOf(line.getQuantity()));
            valByKey.merge(k, lineVal, BigDecimal::add);
            sampleProductId.putIfAbsent(k, line.getProductId());
        }
        for (Map.Entry<String, BigDecimal> e : valByKey.entrySet()) {
            BigDecimal v = e.getValue();
            boolean fail = min ? v.compareTo(bound) < 0 : v.compareTo(bound) > 0;
            if (!fail) {
                continue;
            }
            String key = e.getKey();
            Integer pid = sampleProductId.get(key);
            String scope = key.startsWith("V:") ? ("biến thể ID " + key.substring(2)) : ("sản phẩm ID " + pid);
            if (min) {
                results.add(new ValidationResult(rule.getName(), false,
                        "Tổng giá trị theo " + scope + " trong giỏ là " + formatMoney(v) + " ₫, chưa đạt tối thiểu "
                                + formatMoney(bound) + " ₫ (quy tắc \"" + rule.getName() + "\")."));
            } else {
                results.add(new ValidationResult(rule.getName(), false,
                        "Tổng giá trị theo " + scope + " trong giỏ là " + formatMoney(v) + " ₫, vượt tối đa "
                                + formatMoney(bound) + " ₫ (quy tắc \"" + rule.getName() + "\")."));
            }
        }
    }

    public List<ValidationResult> validateCart(User user, List<CartItemDTO> items) {
        if (items == null) {
            items = List.of();
        }
        List<OrderLimit> activeRules = orderLimitRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .sorted(RULE_PRECEDENCE_ORDER)
                .collect(Collectors.toList());

        List<OrderLimit> rulesToApply = dedupeOverlappingByPriority(resolveWinningRules(user, activeRules));

        List<ValidationResult> results = new ArrayList<>();

        for (OrderLimit rule : rulesToApply) {
            List<CartItemDTO> targetItems = items.stream()
                    .filter(item -> ruleCoreService.isProductMatch(
                            rule.getApplyProductType(),
                            rule.getApplyProductValue(),
                            item.getProductId(),
                            item.getCategoryId()))
                    .collect(Collectors.toList());

            if (targetItems.isEmpty() && !"ALL".equals(rule.getApplyProductType())) {
                continue;
            }

            String limitType = rule.getLimitType();
            String limitLevel = rule.getLimitLevel() != null ? rule.getLimitLevel() : "PER_ORDER";
            BigDecimal limitVal = rule.getLimitValue();

            if (isMinQuantityType(limitType)) {
                int minRequired = limitVal.intValue();
                if (isPerOrderLevel(limitLevel)) {
                    int totalQty = targetItems.stream().mapToInt(CartItemDTO::getQuantity).sum();
                    if (totalQty < minRequired) {
                        results.add(new ValidationResult(rule.getName(), false,
                                "Đơn hàng: tổng số lượng mặt hàng áp dụng là " + totalQty
                                        + ", cần tối thiểu " + minRequired + " (theo quy tắc \"" + rule.getName() + "\")."));
                    }
                } else if (isPerLineLevel(limitLevel)) {
                    validateAggregatedLineQuantities(targetItems, limitLevel, minRequired, true, rule, results);
                }
            } else if (isMaxQuantityType(limitType)) {
                int maxAllowed = limitVal.intValue();
                if (isPerOrderLevel(limitLevel)) {
                    int totalQty = targetItems.stream().mapToInt(CartItemDTO::getQuantity).sum();
                    if (totalQty > maxAllowed) {
                        results.add(new ValidationResult(rule.getName(), false,
                                "Đơn hàng: tổng số lượng mặt hàng áp dụng là " + totalQty
                                        + ", vượt mức tối đa " + maxAllowed + " (quy tắc \"" + rule.getName() + "\"). Vui lòng giảm số lượng hoặc tách đơn."));
                    }
                } else if (isPerLineLevel(limitLevel)) {
                    validateAggregatedLineQuantities(targetItems, limitLevel, maxAllowed, false, rule, results);
                }
            } else if (isMinValueType(limitType)) {
                if (isPerOrderLevel(limitLevel)) {
                    BigDecimal totalValue = targetItems.stream()
                            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (totalValue.compareTo(limitVal) < 0) {
                        results.add(new ValidationResult(rule.getName(), false,
                                "Đơn hàng: tổng giá trị mặt hàng áp dụng là " + formatMoney(totalValue) + " ₫, cần tối thiểu "
                                        + formatMoney(limitVal) + " ₫ (quy tắc \"" + rule.getName() + "\")."));
                    }
                } else if (isPerLineLevel(limitLevel)) {
                    validateAggregatedLineValues(targetItems, limitLevel, limitVal, true, rule, results);
                }
            } else if (isMaxAmountType(limitType)) {
                if (isPerOrderLevel(limitLevel)) {
                    BigDecimal totalValue = targetItems.stream()
                            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if (totalValue.compareTo(limitVal) > 0) {
                        results.add(new ValidationResult(rule.getName(), false,
                                "Đơn hàng: tổng giá trị mặt hàng áp dụng là " + formatMoney(totalValue) + " ₫, vượt mức tối đa "
                                        + formatMoney(limitVal) + " ₫ (quy tắc \"" + rule.getName() + "\"). Vui lòng giảm số lượng hoặc tách đơn."));
                    }
                } else if (isPerLineLevel(limitLevel)) {
                    validateAggregatedLineValues(targetItems, limitLevel, limitVal, false, rule, results);
                }
            }
        }

        return results;
    }

    /**
     * Không cho hai quy tắc MOQ/MOV dùng chung một mức ưu tiên (thông báo trên form + chặn khi lưu).
     */
    public List<String> detectConflicts(OrderLimitRequest draft, Integer excludeRuleId) {
        List<String> out = new ArrayList<>();
        if (draft == null) {
            return out;
        }
        Integer draftPrio = draft.getPriority();
        if (draftPrio == null) {
            return out;
        }
        List<OrderLimit> others = orderLimitRepository.findAll().stream()
                .filter(r -> excludeRuleId == null || !excludeRuleId.equals(r.getId()))
                .collect(Collectors.toList());
        List<OrderLimit> samePrio = others.stream()
                .filter(e -> Objects.equals(draftPrio, e.getPriority()))
                .collect(Collectors.toList());
        if (!samePrio.isEmpty()) {
            String names = samePrio.stream().map(OrderLimit::getName).collect(Collectors.joining("\", \""));
            out.add("BLOCKED: Mức ưu tiên " + draftPrio + " đã được dùng bởi quy tắc \"" + names
                    + "\". Mỗi quy tắc MOQ/MOV phải có mức ưu tiên khác nhau — vui lòng chọn số khác.");
        }
        return out;
    }

    /** Đảm bảo không trùng {@code priority} với quy tắc khác (trừ {@code excludeRuleId} khi sửa). */
    private void assertUniquePriority(Integer priority, Integer excludeRuleId) {
        if (priority == null) {
            return;
        }
        for (OrderLimit e : orderLimitRepository.findAll()) {
            if (excludeRuleId != null && excludeRuleId.equals(e.getId())) {
                continue;
            }
            if (Objects.equals(priority, e.getPriority())) {
                throw new IllegalArgumentException(
                        "Mức ưu tiên " + priority + " đã được dùng bởi quy tắc \"" + e.getName()
                                + "\". Mỗi quy tắc MOQ/MOV phải có mức ưu tiên khác nhau.");
            }
        }
    }
}
