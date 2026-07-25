package com.campusbook.campusbook.subscription;

import com.campusbook.campusbook.enums.SubscriptionTier;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * The pricing tiers from the CampusBook proposal (§6.3). This is the authority
 * for tier limits and features; enforcement and the subscription API both read
 * from here so they never drift.
 */
@Component
public class SubscriptionCatalog {

    private static final Map<SubscriptionTier, SubscriptionPlan> PLANS = Map.of(
            SubscriptionTier.FREE, new SubscriptionPlan(
                    SubscriptionTier.FREE,
                    "Free",
                    "GHS 0 / month",
                    0,      // free — no online payment
                    5,      // up to 5 active rooms
                    20,     // 20 bookings per month
                    false, false, false, false,
                    true,
                    List.of(
                            "Up to 5 rooms",
                            "20 bookings per month",
                            "Basic approval workflow",
                            "Standard support"
                    )
            ),
            SubscriptionTier.CAMPUS_PRO, new SubscriptionPlan(
                    SubscriptionTier.CAMPUS_PRO,
                    "Campus Pro",
                    "GHS 500 / month",
                    50000,  // GHS 500 in pesewas
                    null,   // unlimited rooms
                    null,   // unlimited bookings
                    true, true, true, false,
                    true,
                    List.of(
                            "Unlimited rooms & bookings",
                            "Analytics dashboard & full reporting",
                            "Priority support",
                            "Custom notifications"
                    )
            ),
            SubscriptionTier.ENTERPRISE, new SubscriptionPlan(
                    SubscriptionTier.ENTERPRISE,
                    "Enterprise",
                    "Custom pricing",
                    null,   // custom pricing — contact sales, not online
                    null,
                    null,
                    true, true, true, true,
                    false,  // contact sales — not self-serve
                    List.of(
                            "Everything in Campus Pro",
                            "Multi-campus support",
                            "API integrations with university systems",
                            "Dedicated onboarding & SLA guarantee"
                    )
            )
    );

    public SubscriptionPlan forTier(SubscriptionTier tier) {
        return PLANS.getOrDefault(tier, PLANS.get(SubscriptionTier.FREE));
    }

    /** All plans in display order (Free → Campus Pro → Enterprise). */
    public List<SubscriptionPlan> allPlans() {
        return List.of(
                PLANS.get(SubscriptionTier.FREE),
                PLANS.get(SubscriptionTier.CAMPUS_PRO),
                PLANS.get(SubscriptionTier.ENTERPRISE)
        );
    }
}
