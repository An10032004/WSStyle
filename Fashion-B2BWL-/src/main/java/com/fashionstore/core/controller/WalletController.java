package com.fashionstore.core.controller;

import com.fashionstore.core.model.Wallet;
import com.fashionstore.core.model.WalletTransaction;
import com.fashionstore.core.repository.WalletRepository;
import com.fashionstore.core.repository.WalletTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wallets")
@CrossOrigin(origins = "*")
public class WalletController {

    @Autowired
    private WalletRepository repository;

    @Autowired
    private WalletTransactionRepository transactionRepository;

    @GetMapping
    public List<Wallet> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{userId}")
    public Wallet getByUser(@PathVariable Integer userId) {
        return repository.findByUserId(userId).orElse(null);
    }

    @GetMapping("/{walletId}/transactions")
    public List<WalletTransaction> getTransactions(@PathVariable Integer walletId) {
        return transactionRepository.findByWalletIdOrderByCreatedAtDesc(walletId);
    }
}
