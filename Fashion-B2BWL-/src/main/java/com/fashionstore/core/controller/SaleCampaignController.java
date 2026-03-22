package com.fashionstore.core.controller;

import com.fashionstore.core.model.SaleCampaign;
import com.fashionstore.core.repository.SaleCampaignRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sale-campaigns")
@CrossOrigin(origins = "*")
public class SaleCampaignController {

    @Autowired
    private SaleCampaignRepository repository;

    @GetMapping
    public List<SaleCampaign> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public SaleCampaign create(@RequestBody SaleCampaign campaign) {
        return repository.save(campaign);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        repository.deleteById(id);
    }
}
