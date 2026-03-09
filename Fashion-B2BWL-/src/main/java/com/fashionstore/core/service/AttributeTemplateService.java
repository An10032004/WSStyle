package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.AttributeTemplateRequest;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.AttributeTemplate;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.repository.AttributeTemplateRepository;
import com.fashionstore.core.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AttributeTemplateService {

    private final AttributeTemplateRepository attributeTemplateRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Lấy tất cả attribute templates
     */
    @Transactional(readOnly = true)
    public List<AttributeTemplate> getAllAttributeTemplates() {
        return attributeTemplateRepository.findAll();
    }

    /**
     * Lấy attribute template theo ID
     */
    @Transactional(readOnly = true)
    public AttributeTemplate getAttributeTemplateById(Integer id) {
        return attributeTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attribute Template", "id", id));
    }

    /**
     * Lấy attribute templates theo category
     */
    @Transactional(readOnly = true)
    public List<AttributeTemplate> getByCategory(Integer categoryId) {
        return attributeTemplateRepository.findByCategoryId(categoryId);
    }

    /**
     * Tạo attribute template mới
     */
    public AttributeTemplate createAttributeTemplate(AttributeTemplateRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", request.getCategoryId()));

        AttributeTemplate template = AttributeTemplate.builder()
                .category(category)
                .requiredAttributes(request.getRequiredAttributes())
                .build();

        return attributeTemplateRepository.save(template);
    }

    /**
     * Cập nhật attribute template
     */
    public AttributeTemplate updateAttributeTemplate(Integer id, AttributeTemplateRequest request) {
        AttributeTemplate template = getAttributeTemplateById(id);

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", request.getCategoryId()));

        template.setCategory(category);
        template.setRequiredAttributes(request.getRequiredAttributes());

        return attributeTemplateRepository.save(template);
    }

    /**
     * Xóa attribute template
     */
    public void deleteAttributeTemplate(Integer id) {
        AttributeTemplate template = getAttributeTemplateById(id);
        attributeTemplateRepository.delete(template);
    }
}
