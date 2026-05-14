package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.response.AssistantPricingHintsDTO;
import com.fashionstore.core.dto.response.ProductResponseDTO;
import com.fashionstore.core.model.*;
import com.fashionstore.core.repository.AiAssistantAdminContextRepository;
import com.fashionstore.core.repository.CategoryRepository;
import com.fashionstore.core.repository.ProductRepository;
import com.fashionstore.core.repository.ShippingRuleRepository;
import com.fashionstore.core.repository.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Ghép thêm vào {@code storefrontContext} khi gọi Gemini storefront: rule ACTIVE từ DB, snippet quản trị,
 * vài sản phẩm minh họa (giá/ẩn giá) theo user.
 */
@Service
@RequiredArgsConstructor
public class AssistantStorefrontPromptAugmenter {

    private final RuleCoreService ruleCoreService;
    private final ShippingRuleRepository shippingRuleRepository;
    private final AiAssistantAdminContextRepository aiAssistantAdminContextRepository;
    private final AssistantPricingHintService assistantPricingHintService;
    private final ProductRepository productRepository;
    private final ProductMapperService productMapperService;
    private final UserService userService;
    private final CategoryRepository categoryRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MAX_SAMPLE_PRODUCTS = 5;

    @Transactional(readOnly = true)
    public String augmentStorefrontContext(String storefrontContextFromFe, Integer storefrontUserId) {
        StringBuilder out = new StringBuilder();
        if (storefrontContextFromFe != null && !storefrontContextFromFe.isBlank()) {
            out.append(storefrontContextFromFe.trim());
        }

        String adminSnippets = buildAdminSnippetsBlock();
        if (!adminSnippets.isEmpty()) {
            if (out.length() > 0) {
                out.append("\n\n");
            }
            out.append(adminSnippets);
        }

        String rules = buildActiveRulesMarkdown();
        if (!rules.isEmpty()) {
            if (out.length() > 0) {
                out.append("\n\n");
            }
            out.append(rules);
        }

        String wholesaleScope = buildWholesaleAccountScopeBlock(storefrontUserId);
        if (!wholesaleScope.isEmpty()) {
            if (out.length() > 0) {
                out.append("\n\n");
            }
            out.append(wholesaleScope);
        }

        String samples = buildSampleProductsBlock(storefrontUserId);
        if (!samples.isEmpty()) {
            if (out.length() > 0) {
                out.append("\n\n");
            }
            out.append(samples);
        }

        return out.toString();
    }

    private String buildAdminSnippetsBlock() {
        var rows = aiAssistantAdminContextRepository.findByActiveTrueOrderBySortOrderAscIdAsc();
        if (rows.isEmpty()) {
            return "";
        }
        final int maxRows = AiAssistantAdminContextService.MAX_ACTIVE_CONTEXTS_FOR_AI;
        final int maxBody = AiAssistantAdminContextService.MAX_BODY_LENGTH;
        StringBuilder sb = new StringBuilder();
        sb.append("## Ghi chú quản trị (đọc từ DB — bổ sung cho site-context; tối đa ")
                .append(maxRows)
                .append(" khối, mỗi khối tối đa ")
                .append(maxBody)
                .append(" ký tự)\n");
        int n = 0;
        for (var row : rows) {
            if (n >= maxRows) {
                break;
            }
            sb.append("### ").append(escapeMdHeader(row.getTitle())).append("\n");
            String body = row.getBody() == null ? "" : row.getBody().trim();
            if (body.length() > maxBody) {
                body = body.substring(0, maxBody);
            }
            sb.append(body).append("\n\n");
            n++;
        }
        return sb.toString().trim();
    }

    private static String escapeMdHeader(String t) {
        if (t == null) {
            return "";
        }
        return t.replace("\n", " ").trim();
    }

    private String buildActiveRulesMarkdown() {
        List<PricingRule> pricing =
                ruleCoreService.getAllActivePricingRules().stream()
                        .sorted(Comparator.comparingInt(r -> r.getPriority() == null ? 0 : r.getPriority()))
                        .toList();
        List<HidePriceRule> hide =
                ruleCoreService.getAllActiveHidePriceRules().stream()
                        .sorted(Comparator.comparingInt(r -> r.getPriority() == null ? 0 : r.getPriority()))
                        .toList();
        List<ShippingRule> ship =
                shippingRuleRepository.findAll().stream()
                        .filter(r -> r.getStatus() != null && "ACTIVE".equalsIgnoreCase(r.getStatus().trim()))
                        .sorted(Comparator.comparingInt(r -> r.getPriority() == null ? 0 : r.getPriority()))
                        .toList();
        List<NetTermRule> net =
                ruleCoreService.getAllActiveNetTermRules().stream()
                        .sorted(Comparator.comparingInt(r -> r.getPriority() == null ? 0 : r.getPriority()))
                        .toList();
        List<TaxDisplayRule> tax =
                ruleCoreService.getAllActiveTaxRules().stream()
                        .sorted(Comparator.comparingInt(r -> r.getPriority() == null ? 0 : r.getPriority()))
                        .toList();

        if (pricing.isEmpty() && hide.isEmpty() && ship.isEmpty() && net.isEmpty() && tax.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("## Rule đang ACTIVE (đọc từ DB tại thời điểm gửi tin — mô tả cho khách, không bịa thêm)\n");

        if (!pricing.isEmpty()) {
            sb.append("### Giá / chiết khấu (pricing_rules)\n");
            for (PricingRule r : pricing) {
                sb.append("- **")
                        .append(safe(r.getName()))
                        .append("** (id=")
                        .append(r.getId())
                        .append(", priority=")
                        .append(r.getPriority())
                        .append(", type=")
                        .append(safe(r.getRuleType()))
                        .append(")\n");
                sb.append("  - Khách: ")
                        .append(safe(r.getApplyCustomerType()))
                        .append(" | SP: ")
                        .append(safe(r.getApplyProductType()))
                        .append("\n");
                if (r.getDiscountType() != null || r.getDiscountValue() != null) {
                    sb.append("  - Giảm: ")
                            .append(safe(r.getDiscountType()))
                            .append(" ")
                            .append(r.getDiscountValue() != null ? r.getDiscountValue().toPlainString() : "")
                            .append("\n");
                }
                String scopeExtra = formatPricingRuleProductScope(r);
                if (!scopeExtra.isEmpty()) {
                    sb.append(scopeExtra).append("\n");
                }
            }
            sb.append("\n");
        }

        if (!hide.isEmpty()) {
            sb.append("### Ẩn giá / thay text (hide_price_rules)\n");
            for (HidePriceRule r : hide) {
                sb.append("- **")
                        .append(safe(r.getName()))
                        .append("** (id=")
                        .append(r.getId())
                        .append(", priority=")
                        .append(r.getPriority())
                        .append(")\n");
                sb.append("  - hidePrice=")
                        .append(r.getHidePrice())
                        .append(", replacementText=")
                        .append(safe(r.getReplacementText()))
                        .append("\n");
                sb.append("  - Khách: ")
                        .append(safe(r.getApplyCustomerType()))
                        .append(" | SP: ")
                        .append(safe(r.getApplyProductType()))
                        .append("\n");
                String hideScope = formatHidePriceRuleProductScope(r);
                if (!hideScope.isEmpty()) {
                    sb.append(hideScope).append("\n");
                }
            }
            sb.append("\n");
        }

        if (!ship.isEmpty()) {
            sb.append("### Vận chuyển (shipping_rules)\n");
            for (ShippingRule r : ship) {
                sb.append("- **")
                        .append(safe(r.getName()))
                        .append("** (id=")
                        .append(r.getId())
                        .append(", priority=")
                        .append(r.getPriority())
                        .append(", baseOn=")
                        .append(safe(r.getBaseOn()))
                        .append(")\n");
                sb.append("  - discountType=")
                        .append(safe(r.getDiscountType()))
                        .append(", discountValue=")
                        .append(r.getDiscountValue())
                        .append("\n");
            }
            sb.append("\n");
        }

        if (!net.isEmpty()) {
            sb.append("### Công nợ / net term (net_terms_rules)\n");
            for (NetTermRule r : net) {
                sb.append("- **")
                        .append(safe(r.getName()))
                        .append("** (id=")
                        .append(r.getId())
                        .append(", priority=")
                        .append(r.getPriority())
                        .append(", days=")
                        .append(r.getNetTermDays())
                        .append(")\n");
            }
            sb.append("\n");
        }

        if (!tax.isEmpty()) {
            sb.append("### Hiển thị thuế (tax_display_rules)\n");
            for (TaxDisplayRule r : tax) {
                sb.append("- **")
                        .append(safe(r.getName()))
                        .append("** (id=")
                        .append(r.getId())
                        .append(", priority=")
                        .append(r.getPriority())
                        .append(")\n");
                sb.append("  - taxDisplayType=")
                        .append(safe(r.getTaxDisplayType()))
                        .append(", displayType=")
                        .append(safe(r.getDisplayType()))
                        .append("\n");
            }
        }

        return sb.toString().trim();
    }

    /** Mô tả phạm vi ALL / GROUP+CATEGORY (tên DM) cho từng rule pricing — AI đọc được rõ hơn một dòng `SP: GROUP`. */
    private String formatPricingRuleProductScope(PricingRule r) {
        if (r == null) {
            return "";
        }
        String apt = r.getApplyProductType();
        if (apt == null) {
            return "";
        }
        String aptu = apt.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(aptu)) {
            return "  - **Phạm vi sản phẩm (cho khách khớp rule):** TOÀN BỘ mặt hàng trong shop (theo điều kiện rule).";
        }
        String apv = r.getApplyProductValue();
        if (apv == null || apv.isBlank()) {
            return "";
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> val = objectMapper.readValue(apv, Map.class);
            if ("CATEGORY".equalsIgnoreCase(aptu) || "GROUP".equalsIgnoreCase(aptu)) {
                List<Integer> cids = readIntList(val, "categoryIds");
                if (cids.isEmpty()) {
                    return "  - **Phạm vi sản phẩm:** GROUP/CATEGORY — chưa có id danh mục trong JSON.";
                }
                List<String> labels = new ArrayList<>();
                for (Integer cid : cids) {
                    if (cid == null || cid <= 0) {
                        continue;
                    }
                    categoryRepository
                            .findById(cid)
                            .map(Category::getName)
                            .filter(n -> n != null && !n.isBlank())
                            .ifPresentOrElse(
                                    name -> labels.add(name.trim() + " (id=" + cid + ")"),
                                    () -> labels.add("(danh mục id=" + cid + ")"));
                }
                if (labels.isEmpty()) {
                    return "  - **Phạm vi sản phẩm:** GROUP/CATEGORY — không đọc được danh mục.";
                }
                return "  - **Phạm vi sản phẩm (GROUP/CATEGORY — nêu đúng tên khi khách hỏi giá sỉ):** "
                        + String.join(", ", labels);
            }
            if ("SPECIFIC".equalsIgnoreCase(aptu)) {
                return "  - **Phạm vi sản phẩm:** Danh sách sản phẩm / biến thể **cụ thể** (theo id trong rule JSON).";
            }
        } catch (Exception ignored) {
            return "  - **Phạm vi sản phẩm:** (JSON applyProductValue không đọc được)";
        }
        return "";
    }

    private String formatHidePriceRuleProductScope(HidePriceRule r) {
        if (r == null) {
            return "";
        }
        String apt = r.getApplyProductType();
        if (apt == null) {
            return "";
        }
        String aptu = apt.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(aptu)) {
            return "  - **Phạm vi ẩn giá:** TOÀN BỘ mặt hàng (theo rule).";
        }
        String apv = r.getApplyProductValue();
        if (apv == null || apv.isBlank()) {
            return "";
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> val = objectMapper.readValue(apv, Map.class);
            if ("CATEGORY".equalsIgnoreCase(aptu) || "GROUP".equalsIgnoreCase(aptu)) {
                List<Integer> cids = readIntList(val, "categoryIds");
                List<String> labels = new ArrayList<>();
                for (Integer cid : cids) {
                    if (cid == null || cid <= 0) {
                        continue;
                    }
                    categoryRepository
                            .findById(cid)
                            .map(Category::getName)
                            .filter(n -> n != null && !n.isBlank())
                            .ifPresentOrElse(
                                    name -> labels.add(name.trim() + " (id=" + cid + ")"),
                                    () -> labels.add("(danh mục id=" + cid + ")"));
                }
                if (!labels.isEmpty()) {
                    return "  - **Phạm vi ẩn giá (GROUP/CATEGORY):** " + String.join(", ", labels);
                }
            }
        } catch (Exception ignored) {
            return "";
        }
        return "";
    }

    private static List<Integer> readIntList(Map<String, Object> val, String key) {
        Object raw = val.get(key);
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> out = new ArrayList<>();
        for (Object o : list) {
            if (o instanceof Number n) {
                out.add(n.intValue());
            }
        }
        return out;
    }

    /**
     * Tóm tắt một khối: khách đăng nhập đang được áp rule sỉ/B2B kiểu ALL và/hoặc GROUP (kèm tên DM).
     */
    private String buildWholesaleAccountScopeBlock(Integer storefrontUserId) {
        if (storefrontUserId == null) {
            return "";
        }
        AssistantPricingHintsDTO hints = assistantPricingHintService.computeHints(storefrontUserId);
        boolean all = hints.isWholesaleCoversAllProducts();
        List<String> labels = hints.getWholesaleMatchedGroupCategoryLabels();
        boolean hasGroup = labels != null && !labels.isEmpty();
        if (!all && !hasGroup) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("## Ưu đãi sỉ / B2B **đang áp dụng với tài khoản này** (QUANTITY_BREAK / B2B_PRICE, rule ACTIVE)\n");
        sb.append("*AI: khi khách hỏi giá sỉ / B2B, **nêu rõ** các dòng dưới; ảnh & thẻ SP trong chat chỉ là **vài mặt minh họa**, không phải toàn bộ kho.*\n");
        if (all) {
            sb.append("- **Toàn shop (ALL):** Có — ít nhất một rule áp dụng **mọi sản phẩm** (điều kiện chi tiết theo từng rule trong khối pricing_rules phía trên).\n");
        }
        if (hasGroup) {
            sb.append("- **Nhóm danh mục (GROUP/CATEGORY):** ");
            sb.append(String.join(" · ", labels.stream().map(AssistantStorefrontPromptAugmenter::safe).toList()));
            sb.append("\n");
        }
        return sb.toString().trim();
    }

    private String buildSampleProductsBlock(Integer storefrontUserId) {
        if (storefrontUserId == null) {
            return "";
        }
        User user;
        try {
            user = userService.getUserById(storefrontUserId);
        } catch (Exception e) {
            return "";
        }

        AssistantPricingHintsDTO hints = assistantPricingHintService.computeHints(storefrontUserId);
        LinkedHashSet<Integer> idSet = new LinkedHashSet<>();
        if (hints.getPricingHintProductIds() != null) {
            idSet.addAll(hints.getPricingHintProductIds());
        }

        boolean needFill =
                idSet.size() < MAX_SAMPLE_PRODUCTS
                        && (hints.isWholesaleCoversAllProducts()
                                || (hints.getPricingHintCategoryIds() != null
                                        && !hints.getPricingHintCategoryIds().isEmpty()));

        if (needFill) {
            int room = MAX_SAMPLE_PRODUCTS - idSet.size();
            if (room > 0
                    && hints.getPricingHintCategoryIds() != null
                    && !hints.getPricingHintCategoryIds().isEmpty()) {
                var page =
                        productRepository.findAll(
                                ProductSpecification.filterProducts(
                                        null, hints.getPricingHintCategoryIds(), null, null, List.of(), null, false),
                                PageRequest.of(
                                        0,
                                        Math.max(room * 4, 12),
                                        Sort.by(Sort.Direction.DESC, "id")));
                for (Product p : page.getContent()) {
                    if (p.getId() != null && idSet.size() < MAX_SAMPLE_PRODUCTS) {
                        idSet.add(p.getId());
                    }
                }
            }
            if (idSet.size() < MAX_SAMPLE_PRODUCTS && hints.isWholesaleCoversAllProducts()) {
                var page =
                        productRepository.findAll(
                                ProductSpecification.filterProducts(
                                        null, null, null, null, null, null, false),
                                PageRequest.of(0, MAX_SAMPLE_PRODUCTS * 2, Sort.by(Sort.Direction.DESC, "id")));
                for (Product p : page.getContent()) {
                    if (p.getId() != null && idSet.size() < MAX_SAMPLE_PRODUCTS) {
                        idSet.add(p.getId());
                    }
                }
            }
        }

        List<Integer> ids = idSet.stream().limit(MAX_SAMPLE_PRODUCTS).toList();
        if (ids.isEmpty()) {
            return "";
        }

        List<Product> products = productRepository.findAllById(ids);
        if (products.isEmpty()) {
            return "";
        }

        List<ProductResponseDTO> dtos =
                products.stream()
                        .map(p -> productMapperService.toDTO(p, user))
                        .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        sb.append(
                "## Vài sản phẩm minh họa (tối đa "
                        + MAX_SAMPLE_PRODUCTS
                        + " — **chỉ** đại diện hình ảnh/giá; phạm vi rule có thể rộng hơn, xem khối \"ưu đãi sỉ / B2B\")\n");
        for (ProductResponseDTO p : dtos) {
            sb.append("- **")
                    .append(safe(p.getName()))
                    .append("** (productId=")
                    .append(p.getId())
                    .append(")\n");
            if (Boolean.TRUE.equals(p.getHidePrice())) {
                sb.append("  - Ẩn giá: có; text: ")
                        .append(safe(p.getReplacementText()))
                        .append("\n");
            } else if (p.getCalculatedPrice() != null) {
                sb.append("  - Giá hiển thị (sau rule): ")
                        .append(p.getCalculatedPrice().toPlainString())
                        .append(" ₫");
                if (p.getDiscountLabel() != null && !p.getDiscountLabel().isBlank()) {
                    sb.append("; nhãn: ").append(p.getDiscountLabel().trim().replace("\n", " "));
                }
                sb.append("\n");
            }
        }
        return sb.toString().trim();
    }

    private static String safe(String s) {
        return s == null ? "" : s.replace("\n", " ").trim();
    }
}
