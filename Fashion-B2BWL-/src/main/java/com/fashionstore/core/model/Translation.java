package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "translations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Translation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "resource_id", nullable = false)
    private Integer resourceId;

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType; // e.g., 'PRODUCT', 'CATEGORY'

    @Column(name = "language_code", nullable = false, length = 10)
    private String languageCode; // e.g., 'en', 'vi'

    @Column(name = "content", columnDefinition = "json", nullable = false)
    private String content; // JSON string with translated fields
}
