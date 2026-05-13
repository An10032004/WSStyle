package com.fashionstore.core.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một sản phẩm kèm danh sách variant (phân trang server — tối ưu cho trang gán search_tags). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantProductPickerResponse {
    private Integer id;
    private String productCode;
    private String name;
    private String imageUrl;
    private List<AiAssistantVariantPickerRow> variants;
}
