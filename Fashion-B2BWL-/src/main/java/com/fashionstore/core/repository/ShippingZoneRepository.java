package com.fashionstore.core.repository;

import com.fashionstore.core.model.ShippingZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShippingZoneRepository extends JpaRepository<ShippingZone, Integer> {

    /** Thứ tự ổn định theo id (không dùng priority để “tranh” vùng). */
    List<ShippingZone> findAllByOrderByIdAsc();
}
