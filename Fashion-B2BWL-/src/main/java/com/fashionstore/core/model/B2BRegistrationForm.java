package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "b2b_registration_forms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class B2BRegistrationForm {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "form_data", columnDefinition = "JSON")
    private String formData;
}
