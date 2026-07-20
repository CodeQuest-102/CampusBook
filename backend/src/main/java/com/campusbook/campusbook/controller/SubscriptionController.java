package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.PlanResponse;
import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.dto.UpgradeRequest;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.service.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscription")
@PreAuthorize("hasRole('ADMIN')")
public class SubscriptionController {

    @Autowired
    private SubscriptionService subscriptionService;

    /** The signed-in admin's institution subscription + live usage. */
    @GetMapping
    public ResponseEntity<SubscriptionResponse> getSubscription(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(subscriptionService.getSubscription(user.getInstitution()));
    }

    /** The plan catalog for the upgrade screen. */
    @GetMapping("/plans")
    public ResponseEntity<List<PlanResponse>> getPlans() {
        return ResponseEntity.ok(subscriptionService.getPlans());
    }

    /** Simulated upgrade/downgrade for the institution. */
    @PostMapping("/upgrade")
    public ResponseEntity<SubscriptionResponse> upgrade(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody UpgradeRequest request) {
        return ResponseEntity.ok(subscriptionService.changeTier(user.getInstitution(), request.getTier()));
    }
}
