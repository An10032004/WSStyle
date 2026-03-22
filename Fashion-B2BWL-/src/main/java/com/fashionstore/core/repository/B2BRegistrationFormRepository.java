package com.fashionstore.core.repository;

import com.fashionstore.core.model.B2BRegistrationForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface B2BRegistrationFormRepository extends JpaRepository<B2BRegistrationForm, Integer> {
}
