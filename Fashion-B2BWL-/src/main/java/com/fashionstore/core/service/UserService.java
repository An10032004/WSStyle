package com.fashionstore.core.service;

import com.fashionstore.core.constant.AuthMessages;
import com.fashionstore.core.constant.StorefrontValidationMessages;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.Optional;

import java.util.List;
import java.time.Instant;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    /** Gần với {@code Validators.email} của Angular (đăng ký storefront). */
    private static final Pattern REGISTER_EMAIL_FORMAT =
            Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
    /** Đồng bộ {@code register.ts}: pattern /^0[0-9]{9}$/ */
    private static final Pattern VIETNAM_PHONE_10 = Pattern.compile("^0[0-9]{9}$");

    private final UserRepository userRepository;
    private final CustomerGroupService customerGroupService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();

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

    /**
     * Khi admin duyệt đăng ký đại lý (PENDING → APPROVED), gắn vai trò WHOLESALE phụ trong tags.secondaryRoles.
     */
    public void grantWholesaleSecondaryRoleIfAbsent(User user) {
        try {
            ObjectNode root;
            if (user.getTags() != null && !user.getTags().isBlank()) {
                JsonNode existing = objectMapper.readTree(user.getTags());
                root = existing.isObject() ? (ObjectNode) existing : objectMapper.createObjectNode();
            } else {
                root = objectMapper.createObjectNode();
            }
            ArrayNode secRoles;
            if (root.has("secondaryRoles") && root.get("secondaryRoles").isArray()) {
                secRoles = (ArrayNode) root.get("secondaryRoles");
            } else {
                secRoles = objectMapper.createArrayNode();
            }
            boolean hasWholesale = false;
            for (JsonNode r : secRoles) {
                if (r != null && "WHOLESALE".equalsIgnoreCase(r.asText())) {
                    hasWholesale = true;
                    break;
                }
            }
            if (!hasWholesale) {
                secRoles.add("WHOLESALE");
            }
            root.set("secondaryRoles", secRoles);
            user.setTags(objectMapper.writeValueAsString(root));
        } catch (Exception e) {
            log.warn("grantWholesaleSecondaryRoleIfAbsent failed for user {}: {}", user.getId(), e.getMessage());
        }
    }

    @Transactional
    public User updateUser(Integer id, UserRequest request) {
        User user = getUserById(id);
        String oldRegistrationStatus = user.getRegistrationStatus();

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

        if (request.getRegistrationStatus() != null
                && "APPROVED".equalsIgnoreCase(request.getRegistrationStatus())
                && oldRegistrationStatus != null
                && "PENDING".equalsIgnoreCase(oldRegistrationStatus)) {
            grantWholesaleSecondaryRoleIfAbsent(user);
        }

        return userRepository.save(user);
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_MISSING_BODY);
        }

        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (email.isEmpty()) {
            throw new InvalidEmailException(StorefrontValidationMessages.REGISTER_EMAIL_REQUIRED);
        }
        if (!REGISTER_EMAIL_FORMAT.matcher(email).matches()) {
            throw new InvalidEmailException(StorefrontValidationMessages.REGISTER_EMAIL_FORMAT);
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new InvalidEmailException();
        }

        String fullName = request.getFullName() == null ? "" : request.getFullName().trim();
        if (fullName.isEmpty()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_FULL_NAME_REQUIRED);
        }

        String password = request.getPassword() == null ? "" : request.getPassword();
        if (password.isEmpty()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PASSWORD_REQUIRED);
        }
        if (password.length() < 6) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PASSWORD_MIN_LENGTH);
        }

        String phone = request.getPhone() == null ? "" : request.getPhone().trim();
        if (phone.isEmpty()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PHONE_REQUIRED);
        }
        if (!VIETNAM_PHONE_10.matcher(phone).matches()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PHONE_FORMAT);
        }
        if (password.equals(email) || phone.length() > 0 && password.contains(phone)) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PASSWORD_WEAK);
        }

        if (userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.REGISTER_PHONE_DUPLICATE);
        }

        // Đăng ký tài khoản mua lẻ: APPROVED để mua hàng ngay. Trạng thái PENDING cho hồ sơ đại lý
        // chỉ gán khi gửi form /become-a-partner (B2BRegistrationFormService.createForm).
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .fullName(fullName)
                .phone(phone)
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

    @Transactional
    public User updateShippingAddressJson(Integer userId, String shippingAddressJson) {
        validateShippingAddressJson(shippingAddressJson);
        User user = getUserById(userId);
        user.setShippingAddressJson(shippingAddressJson);
        return userRepository.save(user);
    }

    /**
     * Đồng bộ cấu trúc JSON với {@code vn-address-form} (province/ward + addressDetail + fullLine).
     */
    private void validateShippingAddressJson(String json) {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.SHIPPING_ADDRESS_INCOMPLETE);
        }
        JsonNode o;
        try {
            o = objectMapper.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException(StorefrontValidationMessages.SHIPPING_ADDRESS_JSON_INVALID);
        }
        if (!o.isObject()) {
            throw new IllegalArgumentException(StorefrontValidationMessages.SHIPPING_ADDRESS_JSON_INVALID);
        }
        String[] required = {
                "provinceCode",
                "provinceName",
                "districtCode",
                "districtName",
                "wardCode",
                "wardName",
                "addressDetail",
        };
        for (String k : required) {
            if (!o.has(k) || o.get(k).asText("").isBlank()) {
                throw new IllegalArgumentException(StorefrontValidationMessages.SHIPPING_ADDRESS_INCOMPLETE);
            }
        }
        String detail = o.get("addressDetail").asText("").trim();
        if (detail.length() > 500) {
            throw new IllegalArgumentException(StorefrontValidationMessages.SHIPPING_ADDRESS_DETAIL_MAX);
        }
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
