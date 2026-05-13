package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một dòng biến thể trong UI chọn variant (trang AI assistant admin). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantVariantPickerRow {
    private Integer id;
    private String sku;
    private String color;
    private String size;
    /** Ảnh hiển thị: ưu tiên ảnh variant, không có thì ảnh sản phẩm. */
    private String imageUrl;
    private String searchTags;
}
