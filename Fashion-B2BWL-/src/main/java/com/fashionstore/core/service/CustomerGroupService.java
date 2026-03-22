package com.fashionstore.core.service;

import com.fashionstore.core.dto.request.CustomerGroupRequest;
import com.fashionstore.core.model.CustomerGroup;
import com.fashionstore.core.repository.CustomerGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerGroupService {

    private final CustomerGroupRepository customerGroupRepository;

    public List<CustomerGroup> getAllGroups() {
        return customerGroupRepository.findAll();
    }

    public CustomerGroup getGroupById(Integer id) {
        return customerGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer group not found with id: " + id));
    }

    @Transactional
    public CustomerGroup createGroup(CustomerGroupRequest request) {
        CustomerGroup group = CustomerGroup.builder()
                .name(request.getName())
                .defaultDiscountRate(request.getDefaultDiscountRate())
                .build();
        return customerGroupRepository.save(group);
    }

    @Transactional
    public CustomerGroup updateGroup(Integer id, CustomerGroupRequest request) {
        CustomerGroup group = getGroupById(id);
        group.setName(request.getName());
        group.setDefaultDiscountRate(request.getDefaultDiscountRate());
        return customerGroupRepository.save(group);
    }

    @Transactional
    public void deleteGroup(Integer id) {
        customerGroupRepository.deleteById(id);
    }
}
