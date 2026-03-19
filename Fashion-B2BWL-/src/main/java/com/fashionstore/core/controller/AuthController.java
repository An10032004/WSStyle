package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.LoginRequest;
import com.fashionstore.core.dto.request.RegisterRequest;
import com.fashionstore.core.dto.response.AuthResponse;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        try {
            User user = userService.register(request);
            return ResponseEntity.ok(AuthResponse.builder()
                    .success(true)
                    .message("User registered successfully")
                    .user(user)
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
                .map(user -> ResponseEntity.ok(AuthResponse.builder()
                        .success(true)
                        .message("Login successful")
                        .user(user)
                        .token("mock-token-" + user.getId()) // Placeholder for JWT
                        .build()))
                .orElse(ResponseEntity.status(401).body(AuthResponse.builder()
                        .success(false)
                        .message("Invalid email or password")
                        .build()));
    }
}
