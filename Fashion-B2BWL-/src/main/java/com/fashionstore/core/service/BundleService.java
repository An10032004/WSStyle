package com.fashionstore.core.service;

import com.fashionstore.core.model.Bundle;
import com.fashionstore.core.model.BundleItem;
import com.fashionstore.core.repository.BundleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BundleService {
    private final BundleRepository bundleRepository;

    public List<Bundle> getAllBundles() {
        return bundleRepository.findAll();
    }

    public Bundle getBundleById(Long id) {
        return bundleRepository.findById(id).orElseThrow(() -> new RuntimeException("Bundle not found"));
    }

    @Transactional
    public Bundle createBundle(Bundle bundle) {
        if (bundle.getItems() != null) {
            for (BundleItem item : bundle.getItems()) {
                item.setBundle(bundle);
            }
        }
        return bundleRepository.save(bundle);
    }

    @Transactional
    public Bundle updateBundle(Long id, Bundle updatedBundle) {
        Bundle existing = getBundleById(id);
        existing.setImageUrl(updatedBundle.getImageUrl());
        existing.setName(updatedBundle.getName());
        existing.setStatus(updatedBundle.getStatus());
        existing.setDiscountValue(updatedBundle.getDiscountValue());
        existing.setDiscountType(updatedBundle.getDiscountType());
        existing.setOldPrice(updatedBundle.getOldPrice());
        existing.setNewPrice(updatedBundle.getNewPrice());
        existing.setCustomerType(updatedBundle.getCustomerType());

        // Update items
        existing.getItems().clear();
        if (updatedBundle.getItems() != null) {
            for (BundleItem item : updatedBundle.getItems()) {
                item.setBundle(existing);
                existing.getItems().add(item);
            }
        }

        return bundleRepository.save(existing);
    }

    @Transactional
    public void deleteBundle(Long id) {
        bundleRepository.deleteById(id);
    }
}
