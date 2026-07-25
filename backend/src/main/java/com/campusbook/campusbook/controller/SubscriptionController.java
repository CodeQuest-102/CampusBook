package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.CheckoutRequest;
import com.campusbook.campusbook.dto.CheckoutResponse;
import com.campusbook.campusbook.dto.PlanResponse;
import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.dto.UpgradeRequest;
import com.campusbook.campusbook.dto.VerifyRequest;
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

    /**
     * Direct tier switch. Used for downgrades (including the "Switch to Free"
     * demo reset) and as the simulated upgrade when Paystack is disabled — paid
     * upgrades go through {@link #checkout}/{@link #verify} instead.
     */
    @PostMapping("/upgrade")
    public ResponseEntity<SubscriptionResponse> upgrade(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody UpgradeRequest request) {
        return ResponseEntity.ok(subscriptionService.changeTier(user.getInstitution(), request.getTier()));
    }

    /** Starts a Paystack checkout for a paid upgrade; returns the hosted checkout URL. */
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@AuthenticationPrincipal User user,
                                                     @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(
                subscriptionService.startCheckout(user.getInstitution(), user.getEmail(), request.getTier()));
    }

    /** Verifies a completed Paystack payment and, only then, applies the upgrade. */
    @PostMapping("/verify")
    public ResponseEntity<SubscriptionResponse> verify(@AuthenticationPrincipal User user,
                                                       @Valid @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(
                subscriptionService.completeCheckout(user.getInstitution(), request.getReference()));
    }
}
