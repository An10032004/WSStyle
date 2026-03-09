package com.fashionstore.core.repository;

import com.fashionstore.core.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

    /**
     * Lấy sản phẩm theo danh mục
     */
    List<Product> findByCategoryId(Integer categoryId);

    /**
     * Tìm sản phẩm theo mã sản phẩm (product_code)
     */
    Optional<Product> findByProductCode(String productCode);
}
