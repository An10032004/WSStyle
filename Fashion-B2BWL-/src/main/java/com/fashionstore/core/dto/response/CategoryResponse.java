package com.fashionstore.core.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class CategoryResponse {
    private Integer id;
    private String name;
    private Integer parentId;
    private List<CategoryResponse> children;
}
