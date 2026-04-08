package com.fashionstore.core.service;

import com.fashionstore.core.model.Role;
import com.fashionstore.core.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleByName(String name) {
        var byName = roleRepository.findByName(name);
        if (byName.isPresent()) return byName.get();
        var byNameIgnore = roleRepository.findByNameIgnoreCase(name);
        if (byNameIgnore.isPresent()) return byNameIgnore.get();
        // Final fallback: brute-force case-insensitive search through all roles
        return roleRepository.findAll().stream()
            .filter(r -> r.getName() != null && r.getName().equalsIgnoreCase(name))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Role not found: " + name));
    }

    @Transactional
    public Role saveRole(Role role) {
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(Integer id) {
        roleRepository.deleteById(id);
    }
}
