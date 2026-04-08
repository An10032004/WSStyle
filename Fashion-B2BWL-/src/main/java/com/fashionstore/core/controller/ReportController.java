package com.fashionstore.core.controller;

import com.fashionstore.core.dto.response.ApiResponse;
import com.fashionstore.core.dto.response.SalesReportResponse;
import com.fashionstore.core.dto.response.VatReportResponse;
import com.fashionstore.core.dto.response.VariantReportResponse;
import com.fashionstore.core.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales")
    public ApiResponse<SalesReportResponse> getSalesReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ApiResponse.success(reportService.getSalesReport(startDate, endDate));
    }

    @GetMapping("/vat")
    public ApiResponse<VatReportResponse> getVatReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ApiResponse.success(reportService.getVatReport(startDate, endDate));
    }

    @GetMapping("/variants")
    public ApiResponse<VariantReportResponse> getVariantReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ApiResponse.success(reportService.getVariantSalesReport(startDate, endDate));
    }
}
