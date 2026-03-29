package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.request.UserRequest;
import com.fashionstore.core.model.User;
import com.fashionstore.core.service.UserService;
import com.fashionstore.core.facade.AdminRuleFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AdminRuleFacade adminRuleFacade;

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Users fetched successfully", userService.getAllUsers()));
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<User>>> getUsersByRoles(@RequestParam List<String> roles) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Users fetched successfully", userService.getUsersByRoles(roles)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "User fetched successfully", userService.getUserById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "User created successfully", adminRuleFacade.saveUser(request, null)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable Integer id, @RequestBody UserRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "User updated successfully", adminRuleFacade.saveUser(request, id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Integer id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully", null));
    }
}
