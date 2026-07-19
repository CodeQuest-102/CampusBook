package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.ReportsResponse;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.service.ReportService;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private SubscriptionCatalog subscriptionCatalog;

    /** Basic system counts — available to all admins on any plan. */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/overview")
    public ResponseEntity<ReportsResponse.Overview> overview() {
        return ResponseEntity.ok(reportService.buildOverview());
    }

    /** Full analytics dashboard — a Campus Pro feature. */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/summary")
    public ResponseEntity<ReportsResponse> summary(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "period", defaultValue = "month") String period) {
        boolean analyticsIncluded =
                subscriptionCatalog.forTier(user.getInstitution().getTier()).analytics();
        if (!analyticsIncluded) {
            throw new SubscriptionLimitExceededException(
                    "The analytics dashboard is a Campus Pro feature. Upgrade to unlock reporting.");
        }
        return ResponseEntity.ok(reportService.buildSummary(period));
    }
}
