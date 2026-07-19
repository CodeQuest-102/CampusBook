package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.ReportsResponse;
import com.campusbook.campusbook.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/summary")
    public ResponseEntity<ReportsResponse> summary(
            @RequestParam(value = "period", defaultValue = "month") String period) {
        return ResponseEntity.ok(reportService.buildSummary(period));
    }
}
