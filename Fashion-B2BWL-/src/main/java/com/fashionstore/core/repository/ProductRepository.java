package com.fashionstore.core.repository;

import com.fashionstore.core.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    @Query("SELECT DISTINCT p.brand FROM Product p WHERE p.brand IS NOT NULL AND p.brand != '' AND p.brand != 'No Brand'")
    List<String> findDistinctBrands();

    /**
     * Lấy sản phẩm theo danh mục
     */
    List<Product> findByCategoryId(Integer categoryId);

    /**
     * Tìm sản phẩm theo mã sản phẩm (product_code)
     */
    Optional<Product> findByProductCode(String productCode);
}
