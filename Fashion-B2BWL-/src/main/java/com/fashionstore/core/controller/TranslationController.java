package com.fashionstore.core.controller;

import com.fashionstore.core.dto.request.TranslationRequest;
import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.model.Translation;
import com.fashionstore.core.service.TranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/translations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TranslationController {

    private final TranslationService translationService;

    @PostMapping
    public ResponseEntity<ApiResponse<Translation>> saveTranslation(@Valid @RequestBody TranslationRequest request) {
        Translation saved = translationService.saveTranslation(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Translation saved successfully", saved));
    }

    @GetMapping("/{resourceType}/{resourceId}")
    public ResponseEntity<ApiResponse<List<Translation>>> getTranslationsByResource(
            @PathVariable("resourceType") String resourceType,
            @PathVariable("resourceId") Integer resourceId) {
        List<Translation> translations = translationService.getTranslationsByResource(resourceId, resourceType.toUpperCase());
        return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved translations", translations));
    }

    @GetMapping("/{resourceType}/{resourceId}/{languageCode}")
    public ResponseEntity<ApiResponse<Translation>> getTranslationByResourceAndLanguage(
            @PathVariable("resourceType") String resourceType,
            @PathVariable("resourceId") Integer resourceId,
            @PathVariable("languageCode") String languageCode) {
        Translation translation = translationService.getTranslationByResourceAndLanguage(resourceId, resourceType.toUpperCase(), languageCode);
        return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved translation", translation));
    }

    @GetMapping("/{resourceType}/lang/{languageCode}")
    public ResponseEntity<ApiResponse<List<Translation>>> getTranslationsByTypeAndLanguage(
            @PathVariable("resourceType") String resourceType,
            @PathVariable("languageCode") String languageCode) {
        List<Translation> translations = translationService.getTranslationsByTypeAndLanguage(resourceType.toUpperCase(), languageCode);
        return ResponseEntity.ok(new ApiResponse<>(true, "Successfully retrieved translations", translations));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTranslation(@PathVariable("id") Integer id) {
        translationService.deleteTranslation(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Translation deleted successfully", null));
    }
}
