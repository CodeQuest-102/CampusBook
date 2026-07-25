package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.ReportsResponse;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.Role;
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
    void summary_countsApprovedOnly_forMostBookedRoomAndPeakDay() {
        Hall gf1 = hall(1L, "GF1");
        Hall gf2 = hall(2L, "GF2");

        // Two approved bookings on Wednesday in GF1; the Thursday GF2 booking is only
        // pending, so approved-only reporting must ignore it entirely.
        LocalDateTime wed = LocalDateTime.of(2026, 7, 22, 10, 0);
        LocalDateTime thu = LocalDateTime.of(2026, 7, 23, 10, 0);
        List<Booking> bookings = List.of(
                booking(gf1, wed, BookingStatus.APPROVED),
                booking(gf1, wed.plusHours(3), BookingStatus.APPROVED),
                booking(gf2, thu, BookingStatus.PENDING)
        );

        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(bookings);
        when(hallRepository.countByInstitutionIdAndActiveTrue(1L)).thenReturn(2L);

        ReportsResponse r = reportService.buildSummary(1L, "month");

        assertThat(r.mostBookedRoom().name()).contains("GF1");
        assertThat(r.mostBookedRoom().count()).isEqualTo(2L);
        assertThat(r.peakDay().name()).isEqualTo("Wednesday");
        assertThat(r.utilizationRate()).isBetween(0, 100);
        // "month" period buckets weekly over the ~30-day range (30 days -> 5 weekly buckets).
        assertThat(r.bookingsOverTime()).hasSize(5);
    }

    @Test
    void summary_handlesNoBookings() {
        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(List.of());

        ReportsResponse r = reportService.buildSummary(1L, "week");

        assertThat(r.mostBookedRoom().count()).isZero();
        assertThat(r.peakDay().count()).isZero();
        assertThat(r.utilizationRate()).isZero();
        // "week" period buckets daily over the last 7 days.
        assertThat(r.bookingsOverTime()).hasSize(7);
    }

    @Test
    void summary_yearPeriod_bucketsByTwelveMonths() {
        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(List.of());

        ReportsResponse r = reportService.buildSummary(1L, "year");

        assertThat(r.bookingsOverTime()).hasSize(12);
    }

    @Test
    void exportCsv_includesApprovedOnly_withHeaderAndRows() {
        Hall gf1 = hall(1L, "GF1");
        LocalDateTime wed = LocalDateTime.of(2026, 7, 22, 10, 0);

        Booking approved = booking(gf1, wed, BookingStatus.APPROVED);
        approved.setId(10L);
        approved.setUser(user("Dr. Ada Mensah", Role.LECTURER));
        approved.setPurpose("CSM 297 lecture");
        approved.setAttendance(40);

        Booking pending = booking(gf1, wed.plusHours(3), BookingStatus.PENDING);
        pending.setId(11L);
        pending.setUser(user("Kojo Boateng", Role.STUDENT_LEADER));
        pending.setPurpose("Robotics Club meeting");

        when(bookingRepository.findByHallInstitutionIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(List.of(approved, pending));

        String csv = reportService.exportBookingsCsv(1L, "month");

        assertThat(csv).startsWith("ID,Room,Booked By,Role,Purpose,Attendance,Status,Start,End,Created\n");
        assertThat(csv).contains("Dr. Ada Mensah");
        // The pending booking must be excluded to match the approved-only summary.
        assertThat(csv).doesNotContain("Kojo Boateng");
    }

    private User user(String fullName, Role role) {
        User u = new User();
        u.setFullName(fullName);
        u.setRole(role);
        return u;
    }
}
