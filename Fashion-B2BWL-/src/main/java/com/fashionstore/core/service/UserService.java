package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.LoginRequest;
import com.fashionstore.core.dto.request.RegisterRequest;
import com.fashionstore.core.dto.request.UserRequest;
import com.fashionstore.core.model.CustomerGroup;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CustomerGroupService customerGroupService;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getUsersByRoles(List<String> roles) {
        return userRepository.findByRoleIn(roles);
    }

    public User getUserById(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    @Transactional
    public User createUser(UserRequest request) {
        CustomerGroup group = null;
        if (request.getCustomerGroupId() != null) {
            group = customerGroupService.getGroupById(request.getCustomerGroupId());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : "RETAIL")
                .customerGroup(group)
                .tags(request.getTags())
                .registrationStatus(request.getRegistrationStatus() != null ? request.getRegistrationStatus() : "APPROVED")
                .companyName(request.getCompanyName())
                .taxCode(request.getTaxCode())
                .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Integer id, UserRequest request) {
        User user = getUserById(id);
        
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        
        if (request.getCustomerGroupId() != null) {
            user.setCustomerGroup(customerGroupService.getGroupById(request.getCustomerGroupId()));
        } else {
            user.setCustomerGroup(null);
        }
        
        user.setTags(request.getTags());
        user.setRegistrationStatus(request.getRegistrationStatus());
        user.setCompanyName(request.getCompanyName());
        user.setTaxCode(request.getTaxCode());
        
        return userRepository.save(user);
    }


    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists: " + request.getEmail());
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role("RETAIL") // Default role for storefront users
                .registrationStatus("APPROVED")
                .build();
        return userRepository.save(user);
    }

    public Optional<User> authenticate(LoginRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()));
    }

    @Transactional
    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }
}
