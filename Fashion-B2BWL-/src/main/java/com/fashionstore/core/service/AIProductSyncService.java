package com.fashionstore.core.service;

import com.fashionstore.core.model.AIProductSync;
import com.fashionstore.core.model.Product;
import com.fashionstore.core.repository.AIProductSyncRepository;
import com.fashionstore.core.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AIProductSyncService {

    private final AIProductSyncRepository syncRepository;
    private final ProductRepository productRepository;

    public List<AIProductSync> getAllSyncStatus() {
        return syncRepository.findAll();
    }

    public AIProductSync syncProduct(Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        AIProductSync sync = syncRepository.findByProductId(productId)
                .orElse(AIProductSync.builder()
                        .product(product)
                        .shopId(product.getShopId())
                        .build());

        // Prepare content for RAG
        String content = String.format("Product: %s. Specs: Material - %s, Origin - %s.",
                product.getName(),
                product.getMaterial() != null ? product.getMaterial() : "N/A",
                product.getOrigin() != null ? product.getOrigin() : "N/A");

        sync.setContent(content);
        sync.setVectorId("vec_" + UUID.randomUUID().toString().substring(0, 8)); // Mock vector database ID
        sync.setLastSyncedAt(LocalDateTime.now());

        return syncRepository.save(sync);
    }
}
