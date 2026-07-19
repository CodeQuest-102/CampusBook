package com.campusbook.campusbook.dto;

import java.util.List;

/**
 * The institution's current subscription: plan metadata, entitlements, the tier
 * limits (null = unlimited), and live usage this month.
 */
public record SubscriptionResponse(
        String tier,
        String planName,
        String priceLabel,
        boolean analytics,
        boolean prioritySupport,
        boolean customNotifications,
        boolean apiIntegrations,
        Integer activeHallLimit,       // null = unlimited
        Integer monthlyBookingLimit,   // null = unlimited
        long activeHallsUsed,
        long monthlyBookingsUsed,
        List<String> features
) {
}
