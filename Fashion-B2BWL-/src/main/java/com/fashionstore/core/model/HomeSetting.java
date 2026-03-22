package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "home_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "setting_key", nullable = false, unique = true)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "text")
    private String settingValue;
    
    @Column(name = "shop_id")
    private Integer shopId;
}
