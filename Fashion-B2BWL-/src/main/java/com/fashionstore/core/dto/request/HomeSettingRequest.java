package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeSettingRequest {

    @NotBlank(message = "Setting key không được để trống")
    private String settingKey;

    private String settingValue;
}
