package com.fashionstore.core.repository;

import com.fashionstore.core.model.HomeSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HomeSettingRepository extends JpaRepository<HomeSetting, Integer> {
    Optional<HomeSetting> findBySettingKey(String settingKey);
}
