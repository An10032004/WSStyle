package com.fashionstore.core.repository;

import com.fashionstore.core.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    /**
     * Lấy danh sách danh mục gốc (không có parent)
     */
    List<Category> findByParentIsNull();

    /**
     * Lấy danh mục con theo parent ID
     */
    List<Category> findByParentId(Integer parentId);
}
