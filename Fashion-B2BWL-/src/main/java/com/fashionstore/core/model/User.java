package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    @JsonIgnore
    private String passwordHash;

    @Column(name = "full_name")
    private String fullName;

    private String phone;

    @Column(length = 20)
    private String role; // ADMIN, STAFF, RETAIL, WHOLESALE, GUEST

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_group_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private CustomerGroup customerGroup;

    @Column(columnDefinition = "JSON")
    private String tags;

    @Column(name = "registration_status", length = 20)
    private String registrationStatus; // PENDING, APPROVED, REJECTED

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "tax_code")
    private String taxCode;
}
