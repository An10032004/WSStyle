package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.ExpenseRequest;
import com.fashionstore.core.dto.request.InventoryInflowItemRequest;
import com.fashionstore.core.dto.request.InventoryInflowRequest;
import com.fashionstore.core.dto.response.InventoryInflowReceiptLineResponse;
import com.fashionstore.core.dto.response.InventoryInflowReceiptResponse;
import com.fashionstore.core.dto.response.InventoryInflowVariantRowResponse;
import com.fashionstore.core.model.Expense.ExpenseCategory;
import com.fashionstore.core.model.InventoryInflowReceipt;
import com.fashionstore.core.model.InventoryInflowReceiptLine;
import com.fashionstore.core.model.InventoryInflowReceiptStatus;
import com.fashionstore.core.model.ProductVariant;
import com.fashionstore.core.repository.InventoryInflowReceiptRepository;
import com.fashionstore.core.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryInflowService {

    private static final DateTimeFormatter ISO_LDT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter ISO_LD = DateTimeFormatter.ISO_LOCAL_DATE;

    private final ProductVariantRepository variantRepository;
    private final ExpenseService expenseService;
    private final InventoryInflowReceiptRepository receiptRepository;

    @Transactional(readOnly = true)
    public Page<InventoryInflowReceiptResponse> listReceipts(Long shopId, int page, int size, String statusFilter) {
        long sid = shopId != null ? shopId : 1L;
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<InventoryInflowReceipt> pageResult;
        if (statusFilter != null && !statusFilter.isBlank()) {
            InventoryInflowReceiptStatus st =
                    InventoryInflowReceiptStatus.valueOf(statusFilter.trim().toUpperCase(Locale.ROOT));
            pageResult = receiptRepository.findByShopIdAndStatusOrderByCreatedAtDesc(sid, st, pageable);
        } else {
            pageResult = receiptRepository.findByShopIdOrderByCreatedAtDesc(sid, pageable);
        }
        return pageResult.map(this::toResponseShallow);
    }

    /** Dòng biến thể tối giản cho màn nhập kho (một query JPQL, payload nhỏ). */
    @Transactional(readOnly = true)
    public List<InventoryInflowVariantRowResponse> listVariantsForInflowProduct(Integer productId) {
        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException("productId không hợp lệ.");
        }
        return variantRepository.findInflowRowsByProductId(productId);
    }

    @Transactional(readOnly = true)
    public InventoryInflowReceiptResponse getReceipt(Long id) {
        InventoryInflowReceipt r = receiptRepository
                .findWithLinesById(id)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu không tồn tại"));
        return toResponseFull(r);
    }

    /**
     * Tạo phiếu nhập ở trạng thái nháp — ghi {@code createdAt} đầy đủ (server), chưa cộng tồn kho.
     */
    @Transactional
    public InventoryInflowReceiptResponse createDraft(InventoryInflowRequest request) {
        validateRequest(request);
        LocalDateTime now = LocalDateTime.now();
        InventoryInflowReceipt receipt = InventoryInflowReceipt.builder()
                .status(InventoryInflowReceiptStatus.DRAFT)
                .createdAt(now)
                .documentDate(parseDocumentDate(request.getDate()))
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .shopId(1L)
                .totalAmount(BigDecimal.ZERO)
                .lines(new ArrayList<>())
                .build();

        List<Integer> distinctVariantIds =
                request.getItems().stream()
                        .filter(i -> i.getQuantity() != null && i.getQuantity() > 0)
                        .map(InventoryInflowItemRequest::getVariantId)
                        .distinct()
                        .toList();
        Map<Integer, ProductVariant> variantById =
                variantRepository.findAllById(distinctVariantIds).stream()
                        .filter(v -> v.getId() != null)
                        .collect(Collectors.toMap(ProductVariant::getId, v -> v));
        for (Integer vid : distinctVariantIds) {
            if (!variantById.containsKey(vid)) {
                throw new IllegalArgumentException("Không tìm thấy biến thể: " + vid);
            }
        }

        BigDecimal total = BigDecimal.ZERO;
        for (InventoryInflowItemRequest item : request.getItems()) {
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                continue;
            }
            BigDecimal cost = item.getCostPrice() != null ? item.getCostPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = cost.multiply(BigDecimal.valueOf(item.getQuantity()));
            total = total.add(lineTotal);

            InventoryInflowReceiptLine line = InventoryInflowReceiptLine.builder()
                    .receipt(receipt)
                    .variantId(item.getVariantId())
                    .quantity(item.getQuantity())
                    .costPrice(item.getCostPrice())
                    .build();
            receipt.getLines().add(line);
        }
        if (receipt.getLines().isEmpty()) {
            throw new IllegalArgumentException("Cần ít nhất một dòng với số lượng > 0.");
        }
        receipt.setTotalAmount(total);
        receipt = receiptRepository.save(receipt);
        return toResponseFull(receipt);
    }

    /**
     * Xác nhận nhập kho: cộng tồn, cập nhật giá vốn dòng, ghi chi phí INVENTORY với {@code postedAt} (thời điểm bấm xác nhận).
     */
    @Transactional
    public InventoryInflowReceiptResponse confirmReceipt(Long receiptId) {
        InventoryInflowReceipt receipt = receiptRepository
                .findWithLinesById(receiptId)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu không tồn tại"));
        if (receipt.getStatus() != InventoryInflowReceiptStatus.DRAFT) {
            throw new IllegalStateException("Chỉ phiếu nháp (DRAFT) mới được xác nhận nhập kho.");
        }

        List<Integer> lineVariantIds =
                receipt.getLines().stream().map(InventoryInflowReceiptLine::getVariantId).toList();
        Set<Integer> uniqueIds = new HashSet<>(lineVariantIds);
        Map<Integer, ProductVariant> variantById =
                variantRepository.findAllById(uniqueIds).stream()
                        .filter(v -> v.getId() != null)
                        .collect(Collectors.toMap(ProductVariant::getId, v -> v));
        for (Integer vid : uniqueIds) {
            if (!variantById.containsKey(vid)) {
                throw new IllegalArgumentException("Biến thể không tồn tại: " + vid);
            }
        }

        List<String> detailParts = new ArrayList<>();
        BigDecimal totalCost = BigDecimal.ZERO;

        for (InventoryInflowReceiptLine line : receipt.getLines()) {
            ProductVariant variant = variantById.get(line.getVariantId());
            int qty = line.getQuantity() != null ? line.getQuantity() : 0;
            int oldStock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(oldStock + qty);
            if (line.getCostPrice() != null) {
                variant.setCostPrice(line.getCostPrice());
            }

            BigDecimal lineTotal =
                    line.getCostPrice() != null ? line.getCostPrice().multiply(BigDecimal.valueOf(qty)) : BigDecimal.ZERO;
            totalCost = totalCost.add(lineTotal);
            detailParts.add(String.format("%s (x%d)", variant.getSku() != null ? variant.getSku() : "#" + variant.getId(), qty));
        }
        variantRepository.saveAll(new ArrayList<>(variantById.values()));

        LocalDateTime postedAt = LocalDateTime.now();
        receipt.setPostedAt(postedAt);
        receipt.setStatus(InventoryInflowReceiptStatus.POSTED);
        receiptRepository.save(receipt);

        String descBase =
                receipt.getDescription() != null && !receipt.getDescription().isBlank()
                        ? receipt.getDescription().trim()
                        : "Nhập kho";
        String audit =
                String.format(
                        Locale.ROOT,
                        "[Phiếu #%d] Tạo phiếu: %s | Nhập kho (thống kê): %s | %s",
                        receipt.getId(),
                        receipt.getCreatedAt().format(ISO_LDT),
                        postedAt.format(ISO_LDT),
                        String.join(", ", detailParts));

        String expenseDescription = descBase + " — " + audit;
        // An toàn DB / index: cắt bớt (TEXT vẫn nên tránh bản ghi cực lớn).
        final int maxExpenseDescription = 12_000;
        if (expenseDescription.length() > maxExpenseDescription) {
            expenseDescription =
                    expenseDescription.substring(0, maxExpenseDescription - 3) + "...";
        }

        ExpenseRequest expenseRequest = new ExpenseRequest();
        expenseRequest.setCategory(ExpenseCategory.INVENTORY);
        expenseRequest.setAmount(totalCost);
        expenseRequest.setDate(postedAt.format(ISO_LDT));
        expenseRequest.setDescription(expenseDescription);
        expenseRequest.setShopId(receipt.getShopId());
        expenseRequest.setReceiptDocumentDate(receipt.getDocumentDate());
        expenseRequest.setReceiptCreatedAt(receipt.getCreatedAt());
        expenseService.createExpense(expenseRequest);

        return toResponseFull(receipt);
    }

    @Transactional
    public void cancelDraft(Long receiptId) {
        InventoryInflowReceipt receipt =
                receiptRepository.findById(receiptId).orElseThrow(() -> new IllegalArgumentException("Phiếu không tồn tại"));
        if (receipt.getStatus() != InventoryInflowReceiptStatus.DRAFT) {
            throw new IllegalStateException("Chỉ hủy được phiếu nháp.");
        }
        receipt.setStatus(InventoryInflowReceiptStatus.CANCELLED);
        receiptRepository.save(receipt);
    }

    private void validateRequest(InventoryInflowRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Danh sách dòng hàng không được rỗng.");
        }
    }

    private LocalDate parseDocumentDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return LocalDate.now();
        }
        try {
            if (dateStr.length() >= 10) {
                return LocalDate.parse(dateStr.substring(0, 10), ISO_LD);
            }
            return LocalDate.parse(dateStr, ISO_LD);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private InventoryInflowReceiptResponse toResponseShallow(InventoryInflowReceipt r) {
        return InventoryInflowReceiptResponse.builder()
                .id(r.getId())
                .status(r.getStatus().name())
                .createdAt(formatLdt(r.getCreatedAt()))
                .postedAt(formatLdt(r.getPostedAt()))
                .documentDate(formatLd(r.getDocumentDate()))
                .description(r.getDescription())
                .totalAmount(r.getTotalAmount())
                .lines(Collections.emptyList())
                .build();
    }

    private InventoryInflowReceiptResponse toResponseFull(InventoryInflowReceipt r) {
        Map<Integer, String> skuByVariant = new HashMap<>();
        List<Integer> vids = r.getLines().stream().map(InventoryInflowReceiptLine::getVariantId).toList();
        if (!vids.isEmpty()) {
            for (ProductVariant pv : variantRepository.findAllById(vids)) {
                if (pv.getId() != null) {
                    skuByVariant.put(pv.getId(), pv.getSku() != null ? pv.getSku() : "");
                }
            }
        }
        List<InventoryInflowReceiptLineResponse> lineDtos = new ArrayList<>();
        for (InventoryInflowReceiptLine line : r.getLines()) {
            lineDtos.add(
                    InventoryInflowReceiptLineResponse.builder()
                            .lineId(line.getId())
                            .variantId(line.getVariantId())
                            .sku(skuByVariant.getOrDefault(line.getVariantId(), ""))
                            .quantity(line.getQuantity())
                            .costPrice(line.getCostPrice())
                            .build());
        }
        return InventoryInflowReceiptResponse.builder()
                .id(r.getId())
                .status(r.getStatus().name())
                .createdAt(formatLdt(r.getCreatedAt()))
                .postedAt(formatLdt(r.getPostedAt()))
                .documentDate(formatLd(r.getDocumentDate()))
                .description(r.getDescription())
                .totalAmount(r.getTotalAmount())
                .lines(lineDtos)
                .build();
    }

    private static String formatLdt(LocalDateTime t) {
        return t == null ? null : t.format(ISO_LDT);
    }

    private static String formatLd(LocalDate d) {
        return d == null ? null : d.format(ISO_LD);
    }
}
