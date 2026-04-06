package com.fashionstore.core.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReviewResponseDTO {
    private Integer id;
    private Integer productId;
    private Integer userId;
    private String userName;
    private String userAvatar;
    private Integer rating;
    private String comment;
    private String replyMessage;
    private Boolean isPinned;
    private LocalDateTime createdAt;
}
