package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.ShippingZoneRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.ShippingZone;
import com.fashionstore.core.service.ShippingZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-zones")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShippingZoneController {

    private final ShippingZoneService shippingZoneService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShippingZone>>> list() {
        return ResponseEntity.ok(ApiResponse.success(shippingZoneService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingZone>> get(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(shippingZoneService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ShippingZone>> create(@Valid @RequestBody ShippingZoneRequest request) {
        ShippingZone z = shippingZoneService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Shipping zone created", z));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ShippingZone>> update(@PathVariable Integer id,
                                                             @Valid @RequestBody ShippingZoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Shipping zone updated", shippingZoneService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Integer id) {
        shippingZoneService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Shipping zone deleted", null));
    }
}
