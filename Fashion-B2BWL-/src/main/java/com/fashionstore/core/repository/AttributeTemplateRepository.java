package com.fashionstore.core.repository;

import com.fashionstore.core.model.AttributeTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttributeTemplateRepository extends JpaRepository<AttributeTemplate, Integer> {

    /**
     * Lấy danh sách attribute template theo category
     */
    List<AttributeTemplate> findByCategoryId(Integer categoryId);
}
