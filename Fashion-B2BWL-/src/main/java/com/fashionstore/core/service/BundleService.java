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
        return bundleRepository.findAllWithItems();
    }

    public Bundle getBundleById(Long id) {
        return bundleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new RuntimeException("Bundle not found"));
    }

    /** Combo đang bán có chứa biến thể của sản phẩm (dùng trên trang chi tiết SP). */
    public List<Bundle> getActiveBundlesContainingProduct(Integer productId) {
        if (productId == null) {
            return List.of();
        }
        return bundleRepository.findActiveContainingProductId(productId);
    }

    /** Combo ACTIVE có ít nhất một dòng item trỏ đúng `variantId` (trang chi tiết SP). */
    public List<Bundle> getActiveBundlesContainingVariant(Long variantId) {
        if (variantId == null) {
            return List.of();
        }
        return bundleRepository.findActiveContainingVariantId(variantId);
    }

    @Transactional
    public Bundle createBundle(Bundle bundle) {
        if (bundle.getItems() != null) {
            for (BundleItem item : bundle.getItems()) {
                item.setId(null);
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

        existing.getItems().clear();
        if (updatedBundle.getItems() != null) {
            for (BundleItem src : updatedBundle.getItems()) {
                BundleItem item = new BundleItem();
                item.setVariantId(src.getVariantId());
                item.setQuantity(src.getQuantity() != null ? src.getQuantity() : 1);
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
