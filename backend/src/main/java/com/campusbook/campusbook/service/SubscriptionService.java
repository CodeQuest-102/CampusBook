package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.CheckoutResponse;
import com.campusbook.campusbook.dto.PlanResponse;
import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.PaymentException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import com.campusbook.campusbook.subscription.SubscriptionPlan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SubscriptionService {

    // Paystack rejects reserved / non-routable email domains (e.g. the demo admin's
    // "@campusbook.local"). Real admins have routable emails and pass through.
    private static final Set<String> RESERVED_EMAIL_TLDS =
            Set.of(".local", ".localhost", ".test", ".example", ".invalid");

    @Autowired
    private SubscriptionCatalog catalog;
    @Autowired
    private HallRepository hallRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private InstitutionRepository institutionRepository;
    @Autowired
    private PaystackClient paystackClient;

    @Value("${paystack.enabled:false}")
    private boolean paymentEnabled;
    @Value("${paystack.customer-email:billing@campusbook.app}")
    private String fallbackCustomerEmail;

    public SubscriptionResponse getSubscription(Institution institution) {
        SubscriptionPlan plan = catalog.forTier(institution.getTier());

        // Counted the same way the limit is enforced (HallService.enforceHallLimit):
        // every room on the books, maintenance included. A usage figure that
        // excluded parked rooms would read "3 of 5" right up to a refusal at 5.
        long activeHalls = hallRepository.countByInstitutionId(institution.getId());

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
                plan.features(),
                paymentEnabled
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

    /**
     * Starts a Paystack checkout for a paid upgrade. The amount comes from the
     * catalog — never from the client — and the institution + tier are stamped
     * into the transaction metadata so {@link #completeCheckout} can bind the
     * later verification back to this caller.
     */
    public CheckoutResponse startCheckout(Institution institution, String adminEmail, SubscriptionTier target) {
        SubscriptionPlan plan = catalog.forTier(target);
        if (plan.priceMinor() == null || plan.priceMinor() <= 0 || !plan.selfServe()) {
            throw new IllegalStateException("The " + plan.name() + " plan is not available for online payment.");
        }
        String reference = "CB-" + institution.getId() + "-" + UUID.randomUUID().toString().substring(0, 12);
        PaystackClient.InitResult init = paystackClient.initialize(
                customerEmail(adminEmail), plan.priceMinor(), reference, institution.getId(), target.name());
        return new CheckoutResponse(init.authorizationUrl(), init.reference(), paystackClient.callbackUrl());
    }

    /**
     * The email to bill under. Uses the admin's real email when routable (Paystack
     * ties the transaction to it), but a reserved domain like the demo admin's
     * "@campusbook.local" is rejected by Paystack — so those fall back to a valid
     * billing address (configurable via {@code paystack.customer-email}).
     */
    private String customerEmail(String adminEmail) {
        if (adminEmail == null || adminEmail.isBlank()) {
            return fallbackCustomerEmail;
        }
        String lower = adminEmail.toLowerCase();
        boolean reserved = RESERVED_EMAIL_TLDS.stream().anyMatch(lower::endsWith);
        return reserved ? fallbackCustomerEmail : adminEmail;
    }

    /**
     * Verifies a Paystack reference and, only if it genuinely succeeded for this
     * institution and the right amount, flips the tier. Paystack is the source of
     * truth here — a client can't fake a success it never paid for, and the
     * metadata check stops it from replaying another institution's reference.
     */
    public SubscriptionResponse completeCheckout(Institution institution, String reference) {
        PaystackClient.VerifyResult result = paystackClient.verify(reference);
        if (!result.success()) {
            throw new PaymentException("Payment was not completed.");
        }
        if (result.institutionId() == null || !result.institutionId().equals(institution.getId())) {
            throw new PaymentException("This payment does not belong to your institution.");
        }

        SubscriptionTier target;
        try {
            target = SubscriptionTier.valueOf(result.tier());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new PaymentException("Payment is missing a valid plan.");
        }

        SubscriptionPlan plan = catalog.forTier(target);
        if (!"GHS".equalsIgnoreCase(result.currency())
                || plan.priceMinor() == null
                || !plan.priceMinor().equals(result.amount())) {
            throw new PaymentException("Payment amount did not match the plan.");
        }

        return changeTier(institution, target);
    }
}
