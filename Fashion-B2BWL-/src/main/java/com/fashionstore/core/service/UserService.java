package com.fashionstore.core.service;

import com.fashionstore.core.constant.AuthMessages;
import com.fashionstore.core.dto.auth.LoginAttemptResult;
import com.fashionstore.core.dto.request.LoginRequest;
import com.fashionstore.core.dto.request.RegisterRequest;
import com.fashionstore.core.dto.request.UserRequest;
import com.fashionstore.core.exception.InvalidEmailException;
import com.fashionstore.core.model.AccountStatus;
import com.fashionstore.core.model.CustomerGroup;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

import java.util.List;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final CustomerGroupService customerGroupService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    public List<User> getAllUsers() {
        return userRepository.findAllWithCustomerGroup();
    }

    public List<User> getUsersByRoles(List<String> roles) {
        return userRepository.findByRoleInWithCustomerGroup(roles);
    }

    public User getUserById(Integer id) {
        return userRepository.findByIdWithCustomerGroup(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    @Transactional
    public User createUser(UserRequest request) {
        if (request.getEmail() != null && userRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        CustomerGroup group = null;
        if (request.getCustomerGroupId() != null) {
            group = customerGroupService.getGroupById(request.getCustomerGroupId());
        }

        User user = User.builder()
                .email(request.getEmail() != null ? request.getEmail().trim() : null)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : "RETAIL")
                .customerGroup(group)
                .tags(request.getTags())
                .registrationStatus(
                        request.getRegistrationStatus() != null ? request.getRegistrationStatus() : "APPROVED")
                .companyName(request.getCompanyName())
                .taxCode(request.getTaxCode())
                .accountStatus(parseAccountStatusOrDefault(request.getAccountStatus()))
                .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Integer id, UserRequest request) {
        User user = getUserById(id);

        if (request.getEmail() != null)
            user.setEmail(request.getEmail());
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
        if (request.getAccountStatus() != null && !request.getAccountStatus().isBlank()) {
            user.setAccountStatus(parseAccountStatusOrDefault(request.getAccountStatus()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public User register(RegisterRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (email.isEmpty()) {
            throw new InvalidEmailException();
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new InvalidEmailException();
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role("RETAIL") // Default role for storefront users
                .registrationStatus("APPROVED")
                .companyName(request.getCompanyName())
                .taxCode(request.getTaxCode())
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        return userRepository.save(user);
    }

    /**
     * Đăng nhập: tài khoản xóa mềm / ngừng / {@code active=false} → {@link LoginAttemptResult#invalidEmail()}.
     */
    public LoginAttemptResult attemptLogin(LoginRequest request) {
        String rawEmail = request.getEmail();
        String email = rawEmail == null ? "" : rawEmail.trim();
        log.debug("Authenticating user: {}", email);

        Optional<User> opt = userRepository.findByEmailWithCustomerGroup(email);
        if (opt.isEmpty()) {
            log.warn("Authentication failed for {}: user not found", email);
            return LoginAttemptResult.invalidCredentials();
        }
        User user = opt.get();
        if (!user.isLoginAllowed()) {
            log.warn("Login blocked for {}: active={}, accountStatus={}, deletedAt={}",
                    email, user.isActive(), user.getAccountStatus(), user.getDeletedAt());
            return LoginAttemptResult.invalidEmail();
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Authentication failed for user: {} - Invalid credentials", email);
            return LoginAttemptResult.invalidCredentials();
        }
        log.info("User {} authenticated successfully", email);
        return LoginAttemptResult.success(user);
    }

    @Transactional
    public User save(User user) {
        return userRepository.save(user);
    }

    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    public boolean existsByPhone(String phone) {
        return userRepository.findByPhone(phone).isPresent();
    }

    /**
     * Xóa mềm: đánh dấu đã xóa, thu hồi refresh token, không cho đăng nhập.
     */
    @Transactional
    public void softDeleteUser(Integer id) {
        User user = getUserById(id);
        user.setDeletedAt(Instant.now());
        user.setActive(false);
        user.setAccountStatus(AccountStatus.SUSPENDED);
        userRepository.save(user);
        refreshTokenService.deleteByUserId(id);
    }

    /**
     * Đổi mật khẩu storefront: xác thực bằng email + mật khẩu hiện tại.
     */
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters");
        }
        User user = userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isLoginAllowed()) {
            throw new RuntimeException(AuthMessages.INVALID_EMAIL);
        }
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private static AccountStatus parseAccountStatusOrDefault(String raw) {
        if (raw == null || raw.isBlank()) {
            return AccountStatus.ACTIVE;
        }
        try {
            return AccountStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return AccountStatus.ACTIVE;
        }
    }
}
