package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.request.CustomerGroupRequest;
import com.fashionstore.core.model.CustomerGroup;
import com.fashionstore.core.service.CustomerGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer-groups")
@RequiredArgsConstructor
public class CustomerGroupController {

    private final CustomerGroupService customerGroupService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerGroup>>> getAllGroups() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Groups fetched successfully", customerGroupService.getAllGroups()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerGroup>> getGroupById(@PathVariable Integer id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group fetched successfully", customerGroupService.getGroupById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerGroup>> createGroup(@RequestBody CustomerGroupRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group created successfully", customerGroupService.createGroup(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerGroup>> updateGroup(@PathVariable Integer id, @RequestBody CustomerGroupRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Group updated successfully", customerGroupService.updateGroup(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable Integer id) {
        customerGroupService.deleteGroup(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Group deleted successfully", null));
    }
}
