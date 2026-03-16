package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.request.B2BRegistrationFormRequest;
import com.fashionstore.core.model.B2BRegistrationForm;
import com.fashionstore.core.service.B2BRegistrationFormService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/b2b-registration-forms")
@RequiredArgsConstructor
public class B2BRegistrationFormController {

    private final B2BRegistrationFormService b2bRegistrationFormService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<B2BRegistrationForm>>> getAllForms() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Forms fetched successfully", b2bRegistrationFormService.getAllForms()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<B2BRegistrationForm>> getFormById(@PathVariable Integer id) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Form fetched successfully", b2bRegistrationFormService.getFormById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<B2BRegistrationForm>> createForm(@RequestBody B2BRegistrationFormRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Form created successfully", b2bRegistrationFormService.createForm(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<B2BRegistrationForm>> updateForm(@PathVariable Integer id, @RequestBody B2BRegistrationFormRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Form updated successfully", b2bRegistrationFormService.updateForm(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteForm(@PathVariable Integer id) {
        b2bRegistrationFormService.deleteForm(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Form deleted successfully", null));
    }
}
