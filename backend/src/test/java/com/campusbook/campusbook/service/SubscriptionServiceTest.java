package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.CheckoutResponse;
import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.PaymentException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock HallRepository hallRepository;
    @Mock BookingRepository bookingRepository;
    @Mock InstitutionRepository institutionRepository;
    @Mock PaystackClient paystackClient;

    SubscriptionService service;

    @BeforeEach
    void setUp() {
        service = new SubscriptionService();
        ReflectionTestUtils.setField(service, "catalog", new SubscriptionCatalog());
        ReflectionTestUtils.setField(service, "hallRepository", hallRepository);
        ReflectionTestUtils.setField(service, "bookingRepository", bookingRepository);
        ReflectionTestUtils.setField(service, "institutionRepository", institutionRepository);
        ReflectionTestUtils.setField(service, "paystackClient", paystackClient);
        ReflectionTestUtils.setField(service, "fallbackCustomerEmail", "billing@campusbook.app");
    }

    private void stubUsageCounts() {
        when(hallRepository.countByInstitutionId(1L)).thenReturn(0L);
        when(bookingRepository.countBookingsForInstitutionInRange(anyLong(), any(), any()))
                .thenReturn(0L);
    }

    private Institution institution(SubscriptionTier tier) {
        Institution i = new Institution();
        i.setId(1L);
        i.setName("KNUST");
        i.setTier(tier);
        return i;
    }

    @Test
    void getSubscription_reportsFreeLimitsAndUsage() {
        when(hallRepository.countByInstitutionId(1L)).thenReturn(5L);
        when(bookingRepository.countBookingsForInstitutionInRange(anyLong(), any(), any()))
                .thenReturn(12L);

        SubscriptionResponse r = service.getSubscription(institution(SubscriptionTier.FREE));

        assertThat(r.tier()).isEqualTo("FREE");
        assertThat(r.activeHallLimit()).isEqualTo(5);
        assertThat(r.monthlyBookingLimit()).isEqualTo(20);
        assertThat(r.analytics()).isFalse();
        assertThat(r.activeHallsUsed()).isEqualTo(5L);
        assertThat(r.monthlyBookingsUsed()).isEqualTo(12L);
    }

    @Test
    void getSubscription_proHasUnlimitedAndAnalytics() {
        when(hallRepository.countByInstitutionId(1L)).thenReturn(9L);
        when(bookingRepository.countBookingsForInstitutionInRange(anyLong(), any(), any()))
                .thenReturn(40L);

        SubscriptionResponse r = service.getSubscription(institution(SubscriptionTier.CAMPUS_PRO));

        assertThat(r.tier()).isEqualTo("CAMPUS_PRO");
        assertThat(r.activeHallLimit()).isNull();
        assertThat(r.monthlyBookingLimit()).isNull();
        assertThat(r.analytics()).isTrue();
    }

    @Test
    void changeTier_upgradeToProFlipsTierAndFlags() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(institutionRepository.save(any(Institution.class))).thenAnswer(i -> i.getArgument(0));
        when(hallRepository.countByInstitutionId(1L)).thenReturn(0L);
        when(bookingRepository.countBookingsForInstitutionInRange(anyLong(), any(), any()))
                .thenReturn(0L);

        SubscriptionResponse r = service.changeTier(inst, SubscriptionTier.CAMPUS_PRO);

        assertThat(inst.getTier()).isEqualTo(SubscriptionTier.CAMPUS_PRO);
        assertThat(inst.isAnalyticsEnabled()).isTrue();
        assertThat(inst.isCustomNotificationsEnabled()).isTrue();
        assertThat(r.tier()).isEqualTo("CAMPUS_PRO");
    }

    @Test
    void changeTier_enterpriseIsNotSelfServe() {
        Institution inst = institution(SubscriptionTier.FREE);
        assertThatThrownBy(() -> service.changeTier(inst, SubscriptionTier.ENTERPRISE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Contact sales");
    }

    @Test
    void startCheckout_forPro_usesCatalogAmountAndReturnsUrl() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(paystackClient.initialize(eq("admin@knust.edu.gh"), eq(50000), anyString(),
                eq(1L), eq("CAMPUS_PRO")))
                .thenReturn(new PaystackClient.InitResult("https://checkout.paystack.com/abc", "CB-1-abc"));

        CheckoutResponse r = service.startCheckout(inst, "admin@knust.edu.gh", SubscriptionTier.CAMPUS_PRO);

        assertThat(r.authorizationUrl()).isEqualTo("https://checkout.paystack.com/abc");
        assertThat(r.reference()).isEqualTo("CB-1-abc");
    }

    @Test
    void startCheckout_substitutesReservedDomainEmail() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(paystackClient.initialize(eq("billing@campusbook.app"), eq(50000), anyString(),
                eq(1L), eq("CAMPUS_PRO")))
                .thenReturn(new PaystackClient.InitResult("https://checkout.paystack.com/x", "CB-1-x"));

        // The demo admin's "@campusbook.local" would be rejected by Paystack.
        CheckoutResponse r = service.startCheckout(inst, "admin@campusbook.local", SubscriptionTier.CAMPUS_PRO);

        assertThat(r.reference()).isEqualTo("CB-1-x");
    }

    @Test
    void startCheckout_rejectsFreeAndEnterprise() {
        Institution inst = institution(SubscriptionTier.FREE);
        assertThatThrownBy(() -> service.startCheckout(inst, "a@b.com", SubscriptionTier.FREE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not available for online payment");
        assertThatThrownBy(() -> service.startCheckout(inst, "a@b.com", SubscriptionTier.ENTERPRISE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not available for online payment");
    }

    @Test
    void completeCheckout_successFlipsTierToPro() {
        Institution inst = institution(SubscriptionTier.FREE);
        stubUsageCounts();
        when(institutionRepository.save(any(Institution.class))).thenAnswer(i -> i.getArgument(0));
        when(paystackClient.verify("CB-1-abc"))
                .thenReturn(new PaystackClient.VerifyResult(true, 50000, "GHS", 1L, "CAMPUS_PRO"));

        SubscriptionResponse r = service.completeCheckout(inst, "CB-1-abc");

        assertThat(inst.getTier()).isEqualTo(SubscriptionTier.CAMPUS_PRO);
        assertThat(r.tier()).isEqualTo("CAMPUS_PRO");
    }

    @Test
    void completeCheckout_rejectsUnsuccessfulPayment() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(paystackClient.verify("ref"))
                .thenReturn(new PaystackClient.VerifyResult(false, 50000, "GHS", 1L, "CAMPUS_PRO"));

        assertThatThrownBy(() -> service.completeCheckout(inst, "ref"))
                .isInstanceOf(PaymentException.class)
                .hasMessageContaining("not completed");
        verify(institutionRepository, never()).save(any());
    }

    @Test
    void completeCheckout_rejectsAnotherInstitutionsReference() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(paystackClient.verify("ref"))
                .thenReturn(new PaystackClient.VerifyResult(true, 50000, "GHS", 2L, "CAMPUS_PRO"));

        assertThatThrownBy(() -> service.completeCheckout(inst, "ref"))
                .isInstanceOf(PaymentException.class)
                .hasMessageContaining("does not belong");
        verify(institutionRepository, never()).save(any());
    }

    @Test
    void completeCheckout_rejectsWrongAmount() {
        Institution inst = institution(SubscriptionTier.FREE);
        when(paystackClient.verify("ref"))
                .thenReturn(new PaystackClient.VerifyResult(true, 100, "GHS", 1L, "CAMPUS_PRO"));

        assertThatThrownBy(() -> service.completeCheckout(inst, "ref"))
                .isInstanceOf(PaymentException.class)
                .hasMessageContaining("did not match");
        verify(institutionRepository, never()).save(any());
    }
}
