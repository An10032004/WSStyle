package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.InventoryInflowRequest;
import com.fashionstore.core.service.InventoryInflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inventory/inflow")
@RequiredArgsConstructor
public class InventoryInflowController {

    private final InventoryInflowService inflowService;

    @PostMapping
    public ResponseEntity<?> processInflow(@RequestBody InventoryInflowRequest request) {
        inflowService.processInflow(request);
        return ResponseEntity.ok().build();
    }
}
