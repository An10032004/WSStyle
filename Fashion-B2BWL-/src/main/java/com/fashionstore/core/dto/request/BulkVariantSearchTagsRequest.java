package com.fashionstore.core.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkVariantSearchTagsRequest {

    @NotEmpty
    private List<Integer> variantIds;

    /** Chuỗi tag; rỗng hoặc null = xóa tag các biến thể đã chọn. */
    private String searchTags;
}
