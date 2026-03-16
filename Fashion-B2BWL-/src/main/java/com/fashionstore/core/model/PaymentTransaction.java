package com.fashionstore.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "shop_id")
    private Integer shopId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, length = 50)
    private String provider; // VNPAY

    @Column(name = "transaction_reference", length = 100)
    private String transactionReference;

    @Column(name = "provider_transaction_no", length = 100)
    private String providerTransactionNo;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "bank_code", length = 50)
    private String bankCode;

    @Column(name = "response_code", length = 10)
    private String responseCode;

    @Column(nullable = false, length = 20)
    private String status; // SUCCESS, FAILED, PENDING

    @Column(name = "pay_date")
    private LocalDateTime payDate;
}
