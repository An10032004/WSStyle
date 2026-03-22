package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Role;
import com.fashionstore.core.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Role>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getAllRoles()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Role>> saveRole(@RequestBody Role role) {
        return ResponseEntity.ok(ApiResponse.success("Role saved successfully", roleService.saveRole(role)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Integer id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.success("Role deleted successfully", null));
    }
}
