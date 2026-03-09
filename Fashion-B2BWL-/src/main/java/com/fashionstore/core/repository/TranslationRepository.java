package com.fashionstore.core.repository;

import com.fashionstore.core.model.Translation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TranslationRepository extends JpaRepository<Translation, Integer> {

    List<Translation> findByResourceIdAndResourceType(Integer resourceId, String resourceType);

    Optional<Translation> findByResourceIdAndResourceTypeAndLanguageCode(Integer resourceId, String resourceType, String languageCode);

    List<Translation> findByResourceTypeAndLanguageCode(String resourceType, String languageCode);
}
