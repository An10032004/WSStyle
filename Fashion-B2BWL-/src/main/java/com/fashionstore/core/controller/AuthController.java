package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.LoginRequest;
import com.fashionstore.core.dto.request.RegisterRequest;
import com.fashionstore.core.dto.request.TokenRefreshRequest;
import com.fashionstore.core.dto.response.AuthResponse;
import com.fashionstore.core.dto.response.UserResponse;
import com.fashionstore.core.model.RefreshToken;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.JwtService;
import com.fashionstore.core.service.RefreshTokenService;
import com.fashionstore.core.service.RoleService;
import com.fashionstore.core.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RoleService roleService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        try {
            User user = userService.register(request);
            return ResponseEntity.ok(AuthResponse.builder()
                    .success(true)
                    .message("User registered successfully")
                    .user(mapToUserResponse(user))
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
        return userService.authenticate(request)
                .map(user -> {
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
                })
                .orElse(ResponseEntity.status(401).body(AuthResponse.builder()
                        .success(false)
                        .message("Invalid email or password")
                        .build()));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
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
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    private UserResponse mapToUserResponse(User user) {
        String permissions = "[]";
        try {
            permissions = roleService.getRoleByName(user.getRole()).getPermissionsJson();
        } catch (Exception e) {
            // Fallback for roles not in app_roles table yet
            if ("ADMIN".equals(user.getRole())) permissions = "[\"ALL\"]";
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .companyName(user.getCompanyName())
                .registrationStatus(user.getRegistrationStatus())
                .permissions(permissions)
                .build();
    }
}
