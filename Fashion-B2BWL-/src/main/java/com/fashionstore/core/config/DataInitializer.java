package com.fashionstore.core.config;

import com.fashionstore.core.model.User;
import com.fashionstore.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureAdminUser("admin@fashionb2bwl.com", "Administrator");
    }

    private void ensureAdminUser(String email, String fullName) {
        Optional<User> adminOpt = userRepository.findByEmail(email);

        if (adminOpt.isEmpty()) {
            log.info("Creating default admin user: {}", email);
            User admin = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName(fullName)
                    .role("ADMIN")
                    .registrationStatus("APPROVED")
                    .companyName("WSSTYLE HQ")
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created successfully.");
        } else {
            log.debug("Admin user {} already exists.", email);
        }
    }
}
