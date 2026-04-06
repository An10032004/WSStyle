package com.fashionstore.core.config;

import com.fashionstore.core.model.Role;
import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.RoleRepository;
import com.fashionstore.core.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void run(String... args) {
        ensureAdminUser("admin@fashionb2bwl.com", "Administrator");
        ensureDefaultRoles();
        fixLegacyRoles();
    }

    private void ensureAdminUser(String email, String fullName) {
        Optional<User> adminOpt = userRepository.findByEmail(email);

        if (adminOpt.isEmpty()) {
            log.info("Creating default admin user: {}", email);
            User admin = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName(fullName)
                    .role("Administrator")
                    .registrationStatus("APPROVED")
                    .companyName("WSSTYLE HQ")
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created successfully.");
        } else {
            log.debug("Admin user {} already exists.", email);
        }
    }

    private void ensureDefaultRoles() {
        if (roleRepository.count() == 0) {
            log.info("App roles table is empty. Seeding default roles...");

            String[] allPerms = {
                "Quản lý nhân viên", "Quản lý report", "Quản lý coupon", "Quản lý ví điện tử",
                "Quản lý chiến dịch sale", "Quản lý hồ sơ đại lý", "Quản lý sản phẩm",
                "Quản lý danh mục", "Quản lý đơn hàng", "Quản lý nhóm khách hàng",
                "Quản lý ẩn giá", "Quản lý AI", "Quản lý banner", "Quản lý chiết khấu",
                "Quản lý người dùng", "Quản lý biến thể", "Quản lý giới hạn đặt hàng",
                "Quản lý phí vận chuyển", "Hỗ trợ khách hàng", "Point of sale",
                "Quản lý công nợ", "Quản lý giá thuê"
            };

            try {
                String fullPermsJson = objectMapper.writeValueAsString(allPerms);
                String managerPermsJson = objectMapper.writeValueAsString(new String[]{
                        "Quản lý sản phẩm", "Quản lý danh mục", "Quản lý đơn hàng", "Hỗ trợ khách hàng"
                });
                String editorPermsJson = objectMapper.writeValueAsString(new String[]{
                        "Quản lý sản phẩm", "Quản lý danh mục", "Quản lý banner"
                });

                Role adminRole = Role.builder()
                        .name("Administrator")
                        .description("Full access to all system modules and configuration.")
                        .isAdmin(true)
                        .permissionsJson(fullPermsJson)
                        .build();

                Role managerRole = Role.builder()
                        .name("Manager")
                        .description("Can manage standard business operations like products and orders.")
                        .isAdmin(false)
                        .permissionsJson(managerPermsJson)
                        .build();

                Role editorRole = Role.builder()
                        .name("Content Editor")
                        .description("Can update products, categories, and promotional banners.")
                        .isAdmin(false)
                        .permissionsJson(editorPermsJson)
                        .build();

                Role customerRole = Role.builder()
                        .name("Customer")
                        .description("Default role for registered customers. No administrative access.")
                        .isAdmin(false)
                        .permissionsJson("[]")
                        .build();

                roleRepository.saveAll(List.of(adminRole, managerRole, editorRole, customerRole));
                log.info("Default roles seeded successfully.");

            } catch (JsonProcessingException e) {
                log.error("Error generating permissions JSON for roles seeding", e);
            }
        }
    }

    private void fixLegacyRoles() {
        List<User> legacyAdmins = userRepository.findAll().stream()
                .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                .toList();
        
        if (!legacyAdmins.isEmpty()) {
            log.info("Found {} legacy ADMIN users. Updating to Administrator...", legacyAdmins.size());
            legacyAdmins.forEach(u -> u.setRole("Administrator"));
            userRepository.saveAll(legacyAdmins);
            log.info("Legacy roles fixed.");
        }
    }
}
