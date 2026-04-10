package com.fashionstore.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bundle_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BundleItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bundle_id")
    @JsonIgnore
    private Bundle bundle;

    @Column(name = "variant_id")
    private Long variantId;

    private Integer quantity;
}
