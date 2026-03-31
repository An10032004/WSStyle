package com.fashionstore.core.service;

import com.fashionstore.core.dto.response.SalesReportResponse;
import com.fashionstore.core.dto.response.VatReportResponse;
import com.fashionstore.core.model.Order;
import com.fashionstore.core.model.OrderItem;
import com.fashionstore.core.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final OrderRepository orderRepository;
    private final ExpenseService expenseService;

    public SalesReportResponse getSalesReport(String startDateStr, String endDateStr) {
        LocalDateTime start = parseDateTime(startDateStr, LocalDateTime.now().minusDays(30));
        LocalDateTime end = parseDateTime(endDateStr, LocalDateTime.now());

        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);

        BigDecimal totalRevenue = orders.stream()
                .map(Order::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<com.fashionstore.core.model.Expense> expenses = expenseService.getExpensesByDateRange(1L, start, end);
        BigDecimal totalExpenses = expenses.stream()
                .map(com.fashionstore.core.model.Expense::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netProfit = totalRevenue.subtract(totalExpenses);

        long totalOrders = orders.size();

        // Best Sellers aggregation
        Map<String, SalesReportResponse.BestSeller> bestSellerMap = new HashMap<>();
        for (Order order : orders) {
            for (OrderItem item : order.getItems()) {
                if (item.getProductVariant() == null || item.getProductVariant().getProduct() == null) continue;
                String name = item.getProductVariant().getProduct().getName();
                SalesReportResponse.BestSeller bs = bestSellerMap.getOrDefault(name, 
                    SalesReportResponse.BestSeller.builder()
                        .name(name)
                        .quantity(0)
                        .revenue(BigDecimal.ZERO)
                        .build());
                
                int qty = item.getQuantity() != null ? item.getQuantity() : 0;
                BigDecimal unitPrice = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;

                bs.setQuantity(bs.getQuantity() + qty);
                bs.setRevenue(bs.getRevenue().add(unitPrice.multiply(new BigDecimal(qty))));
                bestSellerMap.put(name, bs);
            }
        }

        List<SalesReportResponse.BestSeller> bestSellers = bestSellerMap.values().stream()
                .sorted(Comparator.comparing(SalesReportResponse.BestSeller::getQuantity).reversed())
                .limit(10)
                .collect(Collectors.toList());

        // Revenue by date
        Map<String, BigDecimal> revenueMap = new TreeMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (Order order : orders) {
            String date = order.getCreatedAt().format(formatter);
            revenueMap.put(date, revenueMap.getOrDefault(date, BigDecimal.ZERO).add(order.getTotalAmount()));
        }

        List<SalesReportResponse.RevenuePoint> revenueByDate = revenueMap.entrySet().stream()
                .map(e -> SalesReportResponse.RevenuePoint.builder()
                        .date(e.getKey())
                        .amount(e.getValue())
                        .build())
                .collect(Collectors.toList());

        return SalesReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalExpenses(totalExpenses)
                .netProfit(netProfit)
                .totalOrders(totalOrders)
                .bestSellers(bestSellers)
                .revenueByDate(revenueByDate)
                .build();
    }

    public VatReportResponse getVatReport(String startDateStr, String endDateStr) {
        LocalDateTime start = parseDateTime(startDateStr, LocalDateTime.now().minusDays(30));
        LocalDateTime end = parseDateTime(endDateStr, LocalDateTime.now());

        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);

        // Sum up collected VAT from all orders
        BigDecimal collectedVat = orders.stream()
                .map(Order::getTaxAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // For simple B2B/Fashion simulation, we might assume 70% of collected VAT is payable
        BigDecimal payableVat = collectedVat.multiply(new BigDecimal("0.7"));
        BigDecimal netVat = collectedVat.subtract(payableVat);

        return VatReportResponse.builder()
                .collectedVat(collectedVat)
                .payableVat(payableVat)
                .netVat(netVat)
                .build();
    }

    private LocalDateTime parseDateTime(String dateStr, LocalDateTime defaultDate) {
        if (dateStr == null || dateStr.isEmpty()) return defaultDate;
        try {
            return LocalDateTime.parse(dateStr + "T00:00:00");
        } catch (Exception e) {
            return defaultDate;
        }
    }
}
