package com.fashionstore.core.controller;

import com.fashionstore.core.constant.AuthMessages;
import com.fashionstore.core.dto.auth.LoginAttemptResult;
import com.fashionstore.core.dto.request.ChangePasswordRequest;
import com.fashionstore.core.dto.request.CompletePasswordResetRequest;
import com.fashionstore.core.dto.request.ForgotPasswordRequest;
import com.fashionstore.core.dto.request.LoginRequest;
import com.fashionstore.core.dto.request.RegisterRequest;
import com.fashionstore.core.dto.request.TokenRefreshRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.AuthResponse;
import com.fashionstore.core.dto.response.CustomerGroupSummaryDTO;
import com.fashionstore.core.dto.response.UserResponse;
import com.fashionstore.core.model.AccountStatus;
import com.fashionstore.core.model.CustomerGroup;
import com.fashionstore.core.model.RefreshToken;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.JwtService;
import com.fashionstore.core.service.RefreshTokenService;
import com.fashionstore.core.exception.InvalidEmailException;
import com.fashionstore.core.service.PasswordResetService;
import com.fashionstore.core.service.RoleService;
import com.fashionstore.core.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RoleService roleService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        try {
            User user = userService.register(request);
            user = userService.getUserById(user.getId());
            return ResponseEntity.ok(AuthResponse.builder()
                    .success(true)
                    .message("User registered successfully")
                    .user(mapToUserResponse(user))
                    .build());
        } catch (InvalidEmailException e) {
            return ResponseEntity.badRequest().body(AuthResponse.builder()
                    .success(false)
                    .message(e.getMessage())
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(AuthResponse.builder()
                    .success(false)
                    .message(e.getMessage())
                    .build());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        LoginAttemptResult result = userService.attemptLogin(request);
        if (result.isSuccess()) {
            var user = result.user();
            String accessToken = jwtService.generateToken(user.getEmail());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

            return ResponseEntity.ok(AuthResponse.builder()
                    .success(true)
                    .message("Login successful")
                    .user(mapToUserResponse(user))
                    .accessToken(accessToken)
                    .refreshToken(refreshToken.getToken())
                    .expiresIn(jwtService.getExpirationTime())
                    .build());
        }
        if (result.emailNotAllowed()) {
            return ResponseEntity.status(401).body(AuthResponse.builder()
                    .success(false)
                    .message(AuthMessages.INVALID_EMAIL)
                    .build());
        }
        return ResponseEntity.status(401).body(AuthResponse.builder()
                .success(false)
                .message(AuthMessages.INVALID_CREDENTIALS)
                .build());
    }

    /**
     * Tránh lỗi Spring "No static resource .../change-password" khi ai đó mở URL bằng GET trên trình duyệt.
     */
    @GetMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePasswordMethodNotAllowed() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error(
                        "Chỉ hỗ trợ POST. Gửi JSON: {\"email\",\"currentPassword\",\"newPassword\"}."));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@RequestBody ChangePasswordRequest request) {
        try {
            userService.changePassword(
                    request.getEmail(),
                    request.getCurrentPassword(),
                    request.getNewPassword());
            return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được cập nhật", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request != null ? request.getEmail() : null);
        return ResponseEntity.ok(ApiResponse.success(
                "Nếu email đã đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu.",
                null));
    }

    @PostMapping("/complete-password-reset")
    public ResponseEntity<ApiResponse<Void>> completePasswordReset(@RequestBody CompletePasswordResetRequest request) {
        try {
            passwordResetService.completeReset(
                    request != null ? request.getToken() : null,
                    request != null ? request.getNewPassword() : null);
            return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được cập nhật.", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<Boolean> checkEmail(@RequestParam String email) {
        return ResponseEntity.ok(userService.existsByEmail(email));
    }

    @GetMapping("/check-phone")
    public ResponseEntity<Boolean> checkPhone(@RequestParam String phone) {
        return ResponseEntity.ok(userService.existsByPhone(phone));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();
        if (requestRefreshToken == null || requestRefreshToken.isBlank()) {
            return ResponseEntity.status(401).body(AuthResponse.builder()
                    .success(false)
                    .message(AuthMessages.INVALID_REFRESH_SESSION)
                    .build());
        }

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(rt -> {
                    try {
                        return refreshTokenService.verifyExpiration(rt);
                    } catch (RuntimeException ex) {
                        log.debug("Refresh token verify failed: {}", ex.getMessage());
                        return null;
                    }
                })
                .map(rt -> {
                    User u = rt.getUser();
                    if (u == null || !u.isLoginAllowed()) {
                        return ResponseEntity.<AuthResponse>status(401).body(AuthResponse.builder()
                                .success(false)
                                .message(AuthMessages.INVALID_EMAIL)
                                .build());
                    }
                    User user = userService.getUserById(u.getId());
                    String token = jwtService.generateToken(user.getEmail());
                    return ResponseEntity.ok(AuthResponse.builder()
                            .success(true)
                            .message("Token refreshed")
                            .user(mapToUserResponse(user))
                            .accessToken(token)
                            .refreshToken(requestRefreshToken)
                            .expiresIn(jwtService.getExpirationTime())
                            .build());
                })
                .orElse(ResponseEntity.status(401).body(AuthResponse.builder()
                        .success(false)
                        .message(AuthMessages.INVALID_REFRESH_SESSION)
                        .build()));
    }

    private static CustomerGroupSummaryDTO toCustomerGroupSummary(CustomerGroup group) {
        if (group == null) {
            return null;
        }
        return CustomerGroupSummaryDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .build();
    }

    private UserResponse mapToUserResponse(User user) {
        String permissions = "[]";
        String userRole = user.getRole();

        // Prefer assignedRole from tags if present (this is the separate permission role)
        String permissionRole = userRole;
        if (user.getTags() != null && !user.getTags().isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> t = new ObjectMapper().readValue(user.getTags(), java.util.Map.class);
                if (t != null && t.containsKey("assignedRole") && t.get("assignedRole") != null) {
                    String ar = String.valueOf(t.get("assignedRole"));
                    if (ar != null && !ar.isBlank()) permissionRole = ar;
                }
            } catch (Exception ex) {
                log.debug("Unable to parse tags for user {}: {}", user.getId(), ex.getMessage());
            }
        }

        // Special Handling for Administrator / super-user: grant all permissions
        String[] allPerms = {
            "Quản lý nhân viên", "Quản lý report", "Quản lý coupon", "Quản lý ví điện tử",
            "Quản lý chiến dịch sale", "Quản lý hồ sơ đại lý", "Quản lý sản phẩm",
            "Quản lý danh mục", "Quản lý đơn hàng", "Quản lý nhóm khách hàng",
            "Quản lý ẩn giá", "Quản lý AI", "Quản lý banner", "Quản lý chiết khấu",
            "Quản lý người dùng", "Quản lý biến thể", "Quản lý giới hạn đặt hàng",
            "Quản lý phí vận chuyển", "Hỗ trợ khách hàng", "Point of sale",
            "Quản lý công nợ", "Quản lý giá thuê"
        };

        try {
            // If the permissionRole is an explicit Administrator alias, or the Role entity is marked isAdmin,
            // grant full permissions. Otherwise load permissionsJson from the Role entity.
            if ("Administrator".equalsIgnoreCase(permissionRole) || "ADMIN".equalsIgnoreCase(permissionRole) || "SUPER_ADMIN".equalsIgnoreCase(permissionRole)) {
                permissions = new ObjectMapper().writeValueAsString(allPerms);
            } else {
                try {
                    var role = roleService.getRoleByName(permissionRole);
                    if (role != null && Boolean.TRUE.equals(role.getIsAdmin())) {
                        permissions = new ObjectMapper().writeValueAsString(allPerms);
                    } else {
                        permissions = role.getPermissionsJson();
                    }
                } catch (Exception e) {
                    log.warn("Could not find permissions for role: {}. Defaulting to empty.", permissionRole);
                }
            }
        } catch (Exception e) {
            permissions = "[\"ALL\"]";
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(userRole)
                .companyName(user.getCompanyName())
                .taxCode(user.getTaxCode())
                .registrationStatus(user.getRegistrationStatus())
                .accountStatus(
                        user.getAccountStatus() != null ? user.getAccountStatus().name() : AccountStatus.ACTIVE.name())
            .customerGroup(toCustomerGroupSummary(user.getCustomerGroup()))
            .tags(user.getTags())
                .shippingAddressJson(user.getShippingAddressJson())
                .permissions(permissions)
                .build();
    }
}
