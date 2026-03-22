package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.CategoryRequest;
import com.fashionstore.core.dto.response.CategoryResponse;
import com.fashionstore.core.exception.ResourceNotFoundException;
import com.fashionstore.core.model.Category;
import com.fashionstore.core.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Lấy tất cả danh mục
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh mục gốc (không có parent)
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> getRootCategories() {
        return categoryRepository.findByParentIsNull().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .shopId(1) // THIẾU: Gán shop_id mặc định là 1 (Admin của Fashion B2BWL)
                .build();

        // Nếu có parentId → gán parent
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục cha", "id", request.getParentId()));
            category.setParent(parent);
        }

        Category saved = categoryRepository.save(category);
        return mapToResponse(saved);
    }

    /**
     * Cập nhật danh mục
     */
    public CategoryResponse updateCategory(Integer id, CategoryRequest request) {
        Category category = getCategoryById(id);
        category.setName(request.getName());

        if (request.getParentId() != null) {
            if (id.equals(request.getParentId())) {
                throw new RuntimeException("Không thể chọn danh mục này làm danh mục cha của chính nó");
            }
            Category parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục cha", "id", request.getParentId()));
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        Category saved = categoryRepository.save(category);
        return mapToResponse(saved);
    }

    /**
     * Xóa danh mục
     */
    public void deleteCategory(Integer id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }

    private CategoryResponse mapToResponse(Category category) {
        if (category == null) return null;
        Integer pid = null;
        if (category.getParent() != null) {
            pid = category.getParent().getId();
            // Safeguard against self-reference in data
            if (category.getId() != null && category.getId().equals(pid)) {
                pid = null;
            }
        }
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .parentId(pid)
                .build();
    }
}
