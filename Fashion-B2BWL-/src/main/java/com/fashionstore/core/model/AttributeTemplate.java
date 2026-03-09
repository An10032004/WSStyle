package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attribute_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttributeTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // --- Quan hệ N-1 với Category ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnore
    private Category category;

    // Lưu JSON string, ví dụ: [{"name":"Size","type":"select","options":["S","M","L"]}, ...]
    @Column(name = "required_attributes", columnDefinition = "json")
    private String requiredAttributes;
}
