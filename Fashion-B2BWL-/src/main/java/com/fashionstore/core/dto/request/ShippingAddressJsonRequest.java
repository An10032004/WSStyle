package com.fashionstore.core.dto.request;

import lombok.Data;

/**
 * Cập nhật địa chỉ giao hàng mặc định trên hồ sơ — toàn bộ payload là một chuỗi JSON (frontend tự cấu trúc).
 */
@Data
public class ShippingAddressJsonRequest {
    private String shippingAddressJson;
}
