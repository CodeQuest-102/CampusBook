package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.ReportsResponse;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock HallRepository hallRepository;

    @InjectMocks ReportService reportService;

    private Hall hall(long id, String code) {
        Hall h = new Hall();
        h.setId(id);
        h.setBlock("Science Complex Block");
        h.setRoomCode(code);
        return h;
    }

    private Booking booking(Hall hall, LocalDateTime start, BookingStatus status) {
        Booking b = new Booking();
        b.setHall(hall);
        b.setStartTime(start);
        b.setEndTime(start.plusHours(2));
        b.setStatus(status);
        return b;
    }

    @Test
    void summary_computesMostBookedRoomAndPeakDay() {
        Hall gf1 = hall(1L, "GF1");
        Hall gf2 = hall(2L, "GF2");

        // Two bookings on Wednesday 2026-07-22 in GF1, one on Thursday in GF2.
        LocalDateTime wed = LocalDateTime.of(2026, 7, 22, 10, 0);
        LocalDateTime thu = LocalDateTime.of(2026, 7, 23, 10, 0);
        List<Booking> bookings = List.of(
                booking(gf1, wed, BookingStatus.APPROVED),
                booking(gf1, wed.plusHours(3), BookingStatus.APPROVED),
                booking(gf2, thu, BookingStatus.PENDING)
        );

        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(bookings);
        when(hallRepository.countByInstitutionId(1L)).thenReturn(5L);
        when(bookingRepository.countByHallInstitutionId(1L)).thenReturn(3L);
        when(bookingRepository.countByHallInstitutionIdAndStatus(1L, BookingStatus.PENDING)).thenReturn(1L);
        when(hallRepository.countByInstitutionIdAndActiveTrue(1L)).thenReturn(2L);

        ReportsResponse r = reportService.buildSummary(1L, "month");

        assertThat(r.overview().totalRooms()).isEqualTo(5L);
        assertThat(r.overview().pendingRequests()).isEqualTo(1L);
        assertThat(r.mostBookedRoom().name()).contains("GF1");
        assertThat(r.mostBookedRoom().count()).isEqualTo(2L);
        assertThat(r.peakDay().name()).isEqualTo("Wednesday");
        assertThat(r.utilizationRate()).isBetween(0, 100);
        assertThat(r.bookingsOverTime()).hasSize(7); // Mon..Sun
    }

    @Test
    void summary_handlesNoBookings() {
        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(List.of());
        when(hallRepository.countByInstitutionId(1L)).thenReturn(0L);
        when(bookingRepository.countByHallInstitutionId(1L)).thenReturn(0L);
        when(bookingRepository.countByHallInstitutionIdAndStatus(1L, BookingStatus.PENDING)).thenReturn(0L);

        ReportsResponse r = reportService.buildSummary(1L, "week");

        assertThat(r.mostBookedRoom().count()).isZero();
        assertThat(r.peakDay().count()).isZero();
        assertThat(r.utilizationRate()).isZero();
        assertThat(r.bookingsOverTime()).hasSize(7);
    }
}
