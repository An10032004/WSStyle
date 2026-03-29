package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.TranslationRequest;
import com.fashionstore.core.model.Translation;
import com.fashionstore.core.repository.TranslationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TranslationService {

    private final TranslationRepository translationRepository;

    public Translation saveTranslation(TranslationRequest request) {
        // Attempt to find an existing translation to update
        Optional<Translation> existingOpt = translationRepository.findByResourceIdAndResourceTypeAndLanguageCode(
                request.getResourceId(),
                request.getResourceType(),
                request.getLanguageCode()
        );

        Translation translation = existingOpt.orElseGet(() -> {
            Translation t = new Translation();
            t.setResourceId(request.getResourceId());
            t.setResourceType(request.getResourceType());
            t.setLanguageCode(request.getLanguageCode());
            return t;
        });

        // Apply new content
        translation.setTranslatedName(request.getTranslatedName());
        translation.setTranslatedDescription(request.getTranslatedDescription());
        translation.setTranslatedData(request.getTranslatedData());

        return translationRepository.save(translation);
    }

    public List<Translation> getTranslationsByResource(Integer resourceId, String resourceType) {
        return translationRepository.findByResourceIdAndResourceType(resourceId, resourceType);
    }
    
    public Translation getTranslationByResourceAndLanguage(Integer resourceId, String resourceType, String languageCode) {
        return translationRepository.findByResourceIdAndResourceTypeAndLanguageCode(resourceId, resourceType, languageCode).orElse(null);
    }

    public List<Translation> getTranslationsByTypeAndLanguage(String resourceType, String languageCode) {
        return translationRepository.findByResourceTypeAndLanguageCode(resourceType, languageCode);
    }

    public void deleteTranslation(Integer id) {
        translationRepository.deleteById(id);
    }
}
