package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.InventoryInflowRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.InventoryInflowReceiptResponse;
import com.fashionstore.core.dto.response.InventoryInflowVariantRowResponse;
import com.fashionstore.core.service.InventoryInflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory/inflow")
@RequiredArgsConstructor
public class InventoryInflowController {

    private final InventoryInflowService inflowService;

    /** Tạo phiếu nhập nháp — ghi {@code createdAt}, chưa cộng tồn. */
    @PostMapping("/receipts")
    public ResponseEntity<ApiResponse<InventoryInflowReceiptResponse>> createDraft(
            @RequestBody InventoryInflowRequest request) {
        return ResponseEntity.ok(ApiResponse.success(inflowService.createDraft(request)));
    }

    /** Xác nhận nhập kho — cộng tồn + chi phí INVENTORY theo thời điểm xác nhận. */
    @PostMapping("/receipts/{id}/confirm")
    public ResponseEntity<ApiResponse<InventoryInflowReceiptResponse>> confirm(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(inflowService.confirmReceipt(id)));
    }

    @DeleteMapping("/receipts/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelDraft(@PathVariable Long id) {
        inflowService.cancelDraft(id);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy phiếu nháp", null));
    }

    @GetMapping("/receipts/{id}")
    public ResponseEntity<ApiResponse<InventoryInflowReceiptResponse>> getReceipt(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(inflowService.getReceipt(id)));
    }

    @GetMapping("/receipts")
    public ResponseEntity<ApiResponse<Page<InventoryInflowReceiptResponse>>> listReceipts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success(inflowService.listReceipts(shopId, page, size, status)));
    }

    /** Biến thể tối giản cho màn nhập kho (ít cột, phản hồi nhanh hơn GET /product-variants/...). */
    @GetMapping("/products/{productId}/variants-for-inflow")
    public ResponseEntity<ApiResponse<List<InventoryInflowVariantRowResponse>>> variantsForInflow(
            @PathVariable Integer productId) {
        return ResponseEntity.ok(ApiResponse.success(inflowService.listVariantsForInflowProduct(productId)));
    }
}
