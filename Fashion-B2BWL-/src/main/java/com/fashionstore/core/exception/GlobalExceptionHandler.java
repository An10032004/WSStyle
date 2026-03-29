package com.fashionstore.core.exception;

import com.fashionstore.core.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý khi không tìm thấy resource (404)
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Xử lý lỗi validation từ @Valid (400)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Dữ liệu không hợp lệ")
                .data(errors)
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Xử lý lỗi ràng buộc dữ liệu (ví dụ: xóa danh mục đang chứa sản phẩm)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String msg = "Thao tác thất bại: Dữ liệu đang có ràng buộc hoặc bị trùng lặp.";
        Throwable rootCause = ex.getRootCause() != null ? ex.getRootCause() : ex;
        String errorMessage = rootCause.getMessage() != null ? rootCause.getMessage().toLowerCase() : "";

        if (errorMessage.contains("duplicate entry")) {
            if (errorMessage.contains("sku")) {
                msg = "Thao tác thất bại: Mã SKU này đã tồn tại.";
            } else if (errorMessage.contains("barcode")) {
                msg = "Thao tác thất bại: Mã vạch (Barcode) này đã tồn tại.";
            } else if (errorMessage.contains("email")) {
                msg = "Thao tác thất bại: Email này đã được đăng ký.";
            } else if (errorMessage.contains("phone")) {
                msg = "Thao tác thất bại: Số điện thoại này đã được sử dụng.";
            } else {
                msg = "Thao tác thất bại: Dữ liệu không hợp lệ. Nguyên nhân: " + errorMessage;
            }
        } else if (errorMessage.contains("foreign key constraint") || errorMessage.contains("cannot delete or update a parent row")) {
            msg = "Thao tác thất bại: Dữ liệu này đang chứa dữ liệu liên quan hợp lệ (Ví dụ: Danh mục đang có Sản phẩm). Vui lòng dọn dẹp dữ liệu con trước!";
        } else {
            msg = "Thao tác thất bại: Dữ liệu đang có ràng buộc hoặc không hợp lệ. Lỗi hệ thống: " + errorMessage;
        }

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(msg));
    }

    /**
     * Xử lý tất cả exception khác (500)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi hệ thống: " + ex.getMessage()));
    }
}
