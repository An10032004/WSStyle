package com.fashionstore.core.repository;

import com.fashionstore.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.customerGroup WHERE u.id = :id")
    Optional<User> findByIdWithCustomerGroup(@Param("id") Integer id);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.customerGroup WHERE u.email = :email")
    Optional<User> findByEmailWithCustomerGroup(@Param("email") String email);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.customerGroup WHERE u.role IN :roles AND u.deletedAt IS NULL")
    List<User> findByRoleInWithCustomerGroup(@Param("roles") List<String> roles);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.customerGroup WHERE u.deletedAt IS NULL")
    List<User> findAllWithCustomerGroup();
}
