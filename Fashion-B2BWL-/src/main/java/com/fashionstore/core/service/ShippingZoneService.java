package com.fashionstore.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fashionstore.core.dto.request.ShippingZoneRequest;
import com.fashionstore.core.model.ShippingZone;
import com.fashionstore.core.repository.ShippingZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingZoneService {

    private final ShippingZoneRepository shippingZoneRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ShippingZone> getAll() {
        return shippingZoneRepository.findAllByOrderByIdAsc();
    }

    public ShippingZone getById(Integer id) {
        return shippingZoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipping zone not found: " + id));
    }

    @Transactional
    public ShippingZone create(ShippingZoneRequest req) {
        ShippingZone z = ShippingZone.builder()
                .name(req.getName())
                .priority(req.getPriority() != null ? req.getPriority() : 0)
                .status(req.getStatus() != null ? req.getStatus() : "ACTIVE")
                .provinceCodes(normalizeProvinceCodesJson(req.getProvinceCodes()))
                .standardFee(scaleMoney(req.getStandardFee()))
                .expressFee(scaleMoney(req.getExpressFee()))
                .build();
        return shippingZoneRepository.save(z);
    }

    @Transactional
    public ShippingZone update(Integer id, ShippingZoneRequest req) {
        ShippingZone z = getById(id);
        if (req.getName() != null) {
            z.setName(req.getName());
        }
        if (req.getPriority() != null) {
            z.setPriority(req.getPriority());
        }
        if (req.getStatus() != null) {
            z.setStatus(req.getStatus());
        }
        if (req.getProvinceCodes() != null) {
            z.setProvinceCodes(normalizeProvinceCodesJson(req.getProvinceCodes()));
        }
        if (req.getStandardFee() != null) {
            z.setStandardFee(scaleMoney(req.getStandardFee()));
        }
        if (req.getExpressFee() != null) {
            z.setExpressFee(scaleMoney(req.getExpressFee()));
        }
        return shippingZoneRepository.save(z);
    }

    @Transactional
    public void delete(Integer id) {
        shippingZoneRepository.deleteById(id);
    }

    /**
     * Vùng ACTIVE đầu tiên (theo id) có chứa mã tỉnh — áp dụng mọi khách, không xếp hạng ưu tiên với quy tắc phí bảng.
     */
    @Transactional(readOnly = true)
    public Optional<ShippingZone> findActiveZoneForProvince(String provinceCode) {
        if (provinceCode == null || provinceCode.isBlank()) {
            return Optional.empty();
        }
        String code = provinceCode.trim();
        List<ShippingZone> list = shippingZoneRepository.findAllByOrderByIdAsc();
        for (ShippingZone z : list) {
            if (!"ACTIVE".equalsIgnoreCase(z.getStatus())) {
                continue;
            }
            if (provinceCodesContain(z.getProvinceCodes(), code)) {
                return Optional.of(z);
            }
        }
        return Optional.empty();
    }

    private boolean provinceCodesContain(String json, String provinceCode) {
        if (json == null || json.isBlank()) {
            return false;
        }
        try {
            JsonNode arr = objectMapper.readTree(json);
            if (!arr.isArray()) {
                return false;
            }
            for (JsonNode n : arr) {
                if (n != null && provinceCode.equalsIgnoreCase(n.asText("").trim())) {
                    return true;
                }
            }
        } catch (Exception e) {
            log.warn("provinceCodesContain: {}", e.getMessage());
        }
        return false;
    }

    private static String normalizeProvinceCodesJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return "[]";
        }
        String t = raw.trim();
        try {
            JsonNode n = new ObjectMapper().readTree(t);
            if (!n.isArray()) {
                return "[]";
            }
            List<String> out = new ArrayList<>();
            for (JsonNode x : n) {
                if (x != null && !x.asText("").isBlank()) {
                    out.add(x.asText("").trim());
                }
            }
            return new ObjectMapper().writeValueAsString(out);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static BigDecimal scaleMoney(BigDecimal v) {
        if (v == null) {
            return BigDecimal.ZERO;
        }
        return v.setScale(0, RoundingMode.HALF_UP);
    }
}
