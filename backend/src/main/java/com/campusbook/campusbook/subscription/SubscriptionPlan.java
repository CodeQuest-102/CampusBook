package com.campusbook.campusbook.subscription;

import com.campusbook.campusbook.enums.SubscriptionTier;

import java.util.List;

/**
 * Static metadata for a subscription tier — the single source of truth for
 * limits (null = unlimited) and feature entitlements. See {@link SubscriptionCatalog}.
 */
public record SubscriptionPlan(
        SubscriptionTier tier,
        String name,
        String priceLabel,
        Integer activeHallLimit,       // null = unlimited
        Integer monthlyBookingLimit,   // null = unlimited
        boolean analytics,
        boolean prioritySupport,
        boolean customNotifications,
        boolean apiIntegrations,
        boolean selfServe,             // can an admin switch to this tier in-app?
        List<String> features
) {
}
