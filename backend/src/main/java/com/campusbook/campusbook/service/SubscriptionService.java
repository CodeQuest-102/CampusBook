package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.PlanResponse;
import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import com.campusbook.campusbook.subscription.SubscriptionPlan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class SubscriptionService {

    @Autowired
    private SubscriptionCatalog catalog;
    @Autowired
    private HallRepository hallRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private InstitutionRepository institutionRepository;

    public SubscriptionResponse getSubscription(Institution institution) {
        SubscriptionPlan plan = catalog.forTier(institution.getTier());

        long activeHalls = hallRepository.countByInstitutionIdAndActiveTrue(institution.getId());

        YearMonth month = YearMonth.now();
        LocalDateTime monthStart = month.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = month.plusMonths(1).atDay(1).atStartOfDay();
        long monthlyBookings = bookingRepository.countBookingsForInstitutionInRange(
                institution.getId(), monthStart, monthEnd);

        return new SubscriptionResponse(
                plan.tier().name(),
                plan.name(),
                plan.priceLabel(),
                plan.analytics(),
                plan.prioritySupport(),
                plan.customNotifications(),
                plan.apiIntegrations(),
                plan.activeHallLimit(),
                plan.monthlyBookingLimit(),
                activeHalls,
                monthlyBookings,
                plan.features()
        );
    }

    public List<PlanResponse> getPlans() {
        return catalog.allPlans().stream().map(PlanResponse::from).toList();
    }

    /**
     * Simulated upgrade/downgrade: flips the institution's tier and syncs the
     * feature flags. Enterprise is not self-serve (contact sales).
     */
    public SubscriptionResponse changeTier(Institution institution, SubscriptionTier target) {
        SubscriptionPlan plan = catalog.forTier(target);
        if (!plan.selfServe()) {
            throw new IllegalStateException("Contact sales to move to the " + plan.name() + " plan.");
        }

        institution.setTier(target);
        institution.setAnalyticsEnabled(plan.analytics());
        institution.setCustomNotificationsEnabled(plan.customNotifications());
        institution.setApiIntegrationsEnabled(plan.apiIntegrations());
        Institution saved = institutionRepository.save(institution);

        return getSubscription(saved);
    }
}
