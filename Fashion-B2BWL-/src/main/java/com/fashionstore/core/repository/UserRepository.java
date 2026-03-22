package com.fashionstore.core.repository;

import com.fashionstore.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    java.util.List<User> findByRoleIn(java.util.List<String> roles);
}
