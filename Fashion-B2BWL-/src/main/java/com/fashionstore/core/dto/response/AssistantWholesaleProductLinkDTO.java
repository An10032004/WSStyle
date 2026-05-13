package com.fashionstore.core.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Liên kết storefront tương đối (không URL tuyệt đối) — hiển thị phía trên lưới ảnh khi khách hỏi giá sỉ / vai trò.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantWholesaleProductLinkDTO {
    private Integer productId;
    private String name;
    /** Ví dụ {@code /product/12} — dùng với router SPA, không tiền tố http. */
    private String path;
}
