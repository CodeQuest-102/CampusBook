package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.subscription.SubscriptionPlan;

import java.util.List;

/** A catalog entry for the upgrade screen. */
public record PlanResponse(
        String tier,
        String name,
        String priceLabel,
        Integer activeHallLimit,       // null = unlimited
        Integer monthlyBookingLimit,   // null = unlimited
        boolean selfServe,             // false for Enterprise (contact sales)
        List<String> features
) {
    public static PlanResponse from(SubscriptionPlan plan) {
        return new PlanResponse(
                plan.tier().name(),
                plan.name(),
                plan.priceLabel(),
                plan.activeHallLimit(),
                plan.monthlyBookingLimit(),
                plan.selfServe(),
                plan.features()
        );
    }
}
