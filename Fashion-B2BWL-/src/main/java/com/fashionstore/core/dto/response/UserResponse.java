package com.fashionstore.core.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private Integer id;
    private String email;
    private String fullName;
    private String phone;
    private String role;
    private String companyName;
    private String taxCode;
    private String registrationStatus;
    /** ACTIVE | SUSPENDED */
    private String accountStatus;
    private String permissions;
    /** Nhóm khách (pricing rules GROUP) — có thể null nếu admin chưa gán */
    private CustomerGroupSummaryDTO customerGroup;
    private String tags;
    /** JSON địa chỉ giao hàng mặc định (tỉnh/quận/phường + chi tiết). */
    private String shippingAddressJson;
}
