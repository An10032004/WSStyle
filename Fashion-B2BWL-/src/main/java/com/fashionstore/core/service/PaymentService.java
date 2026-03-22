package com.fashionstore.core.service;

import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.PaymentTransaction;
import com.fashionstore.core.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentTransactionRepository transactionRepository;
    private final OrderService orderService;

    @Transactional
    public PaymentTransaction createTransaction(Integer orderId, PaymentTransaction transaction) {
        Order order = orderService.getOrderById(orderId);
        transaction.setOrder(order);
        transaction.setPayDate(LocalDateTime.now());
        
        PaymentTransaction saved = transactionRepository.save(transaction);
        
        if ("SUCCESS".equals(transaction.getStatus())) {
            orderService.updatePaymentStatus(orderId, "PAID");
        }
        
        return saved;
    }

    public List<PaymentTransaction> getTransactionsByOrder(Integer orderId) {
        return transactionRepository.findByOrderId(orderId);
    }
}
