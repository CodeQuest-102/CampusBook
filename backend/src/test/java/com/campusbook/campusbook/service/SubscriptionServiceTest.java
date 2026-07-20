package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.SubscriptionResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.enums.SubscriptionTier;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock HallRepository hallRepository;
    @Mock BookingRepository bookingRepository;
    @Mock InstitutionRepository institutionRepository;

    SubscriptionService service;

    @BeforeEach
    void setUp() {
        service = new SubscriptionService();
        ReflectionTestUtils.setField(service, "catalog", new SubscriptionCatalog());
        ReflectionTestUtils.setField(service, "hallRepository", hallRepository);
        ReflectionTestUtils.setField(service, "bookingRepository", bookingRepository);
        ReflectionTestUtils.setField(service, "institutionRepository", institutionRepository);
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
        when(hallRepository.countByInstitutionIdAndActiveTrue(1L)).thenReturn(5L);
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
        when(hallRepository.countByInstitutionIdAndActiveTrue(1L)).thenReturn(9L);
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
        when(hallRepository.countByInstitutionIdAndActiveTrue(1L)).thenReturn(0L);
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
}
