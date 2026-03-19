package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.HomeSettingRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.HomeSetting;
import com.fashionstore.core.repository.HomeSettingRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/home-settings")
@RequiredArgsConstructor
public class HomeSettingController {

    private final HomeSettingRepository homeSettingRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<HomeSetting>>> getAllSettings() {
        return ResponseEntity.ok(ApiResponse.success(homeSettingRepository.findAll()));
    }

    @GetMapping("/{key}")
    public ResponseEntity<ApiResponse<HomeSetting>> getSettingByKey(@PathVariable String key) {
        return ResponseEntity.ok(ApiResponse.success(
            homeSettingRepository.findBySettingKey(key).orElse(null)
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HomeSetting>> updateSetting(@Valid @RequestBody HomeSettingRequest request) {
        HomeSetting setting = homeSettingRepository.findBySettingKey(request.getSettingKey())
            .orElse(HomeSetting.builder()
                .settingKey(request.getSettingKey())
                .shopId(1) // Default shop
                .build());
        
        setting.setSettingValue(request.getSettingValue());
        HomeSetting saved = homeSettingRepository.save(setting);
        
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cài đặt thành công", saved));
    }
}
