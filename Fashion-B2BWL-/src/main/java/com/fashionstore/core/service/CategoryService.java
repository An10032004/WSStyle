package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.CategoryRequest;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Lấy tất cả danh mục
     */
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    /**
     * Lấy danh mục gốc (không có parent)
     */
    @Transactional(readOnly = true)
    public List<Category> getRootCategories() {
        return categoryRepository.findByParentIsNull();
    }

    /**
     * Lấy danh mục theo ID
     */
    @Transactional(readOnly = true)
    public Category getCategoryById(Integer id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục", "id", id));
    }

    /**
     * Tạo danh mục mới
     */
    public Category createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .build();

        // Nếu có parentId → gán parent
        if (request.getParentId() != null) {
            Category parent = getCategoryById(request.getParentId());
            category.setParent(parent);
        }

        return categoryRepository.save(category);
    }

    /**
     * Cập nhật danh mục
     */
    public Category updateCategory(Integer id, CategoryRequest request) {
        Category category = getCategoryById(id);
        category.setName(request.getName());

        if (request.getParentId() != null) {
            Category parent = getCategoryById(request.getParentId());
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        return categoryRepository.save(category);
    }

    /**
     * Xóa danh mục
     */
    public void deleteCategory(Integer id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }
}
