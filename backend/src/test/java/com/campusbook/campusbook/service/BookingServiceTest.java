package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock HallRepository hallRepository;
    @Mock NotificationService notificationService;

    @InjectMocks BookingService bookingService;

    @BeforeEach
    void injectRealCatalog() {
        // Real catalog so tier limits resolve; the mocked one would return null.
        ReflectionTestUtils.setField(bookingService, "subscriptionCatalog", new SubscriptionCatalog());
    }

    private Institution institution() {
        Institution i = new Institution();
        i.setId(1L);
        i.setName("KNUST");
        i.setTier(SubscriptionTier.FREE);
        return i;
    }

    private Hall activeHall(Institution i) {
        Hall h = new Hall();
        h.setId(2L);
        h.setBlock("Science Complex Block");
        h.setRoomCode("GF1");
        h.setActive(true);
        h.setInstitution(i);
        return h;
    }

    private User user(long id) {
        User u = new User();
        u.setId(id);
        u.setFullName("Test User");
        u.setRole(Role.STUDENT_LEADER);
        return u;
    }

    private Booking booking(Hall hall, User user, LocalDateTime start, LocalDateTime end) {
        Booking b = new Booking();
        b.setId(10L);
        b.setHall(hall);
        b.setUser(user);
        b.setPurpose("Meeting");
        b.setStartTime(start);
        b.setEndTime(end);
        b.setStatus(BookingStatus.PENDING);
        return b;
    }

    @Test
    void createBooking_rejectsPastStart() {
        Hall hall = activeHall(institution());
        Booking b = booking(hall, user(1L),
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusHours(1));

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("past");

        verifyNoInteractions(notificationService);
    }

    @Test
    void createBooking_rejectsOverlappingSlot() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, user(1L), start, start.plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of(new Booking()));

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("overlapping");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void reschedule_resetsToPendingAndNotifiesAdmins() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User owner = user(1L);
        Booking existing = booking(hall, owner,
                LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2));
        existing.setStatus(BookingStatus.APPROVED);
        existing.setApprovedBy(user(99L));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(10L), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime newStart = LocalDateTime.now().plusDays(2);
        Booking result = bookingService.rescheduleBooking(10L, owner, newStart, newStart.plusHours(2));

        assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(result.getApprovedBy()).isNull();
        assertThat(result.getStartTime()).isEqualTo(newStart);
        verify(notificationService).notifyInstitutionAdmins(eq(1L), any(), any(), any(), eq(10L));
    }

    @Test
    void reschedule_rejectsNonOwnerNonAdmin() {
        Hall hall = activeHall(institution());
        Booking existing = booking(hall, user(1L),
                LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(existing));

        User stranger = user(2L);
        LocalDateTime newStart = LocalDateTime.now().plusDays(2);

        assertThatThrownBy(() ->
                bookingService.rescheduleBooking(10L, stranger, newStart, newStart.plusHours(2)))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void recurring_createsOnePerWeekWhenNoConflicts() {
        Hall hall = activeHall(institution());
        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        LocalDateTime first = LocalDateTime.now().plusDays(3).withHour(10).withMinute(0).withSecond(0).withNano(0);
        LocalDate until = first.toLocalDate().plusWeeks(2); // 3 occurrences

        BookingService.RecurringResult result = bookingService.createRecurringBookings(
                user(1L), 2L, "Weekly Lecture", null, 40, first, first.plusHours(2), until);

        assertThat(result.created()).hasSize(3);
        assertThat(result.skipped()).isEmpty();
        assertThat(result.created()).allMatch(b -> b.getStatus() == BookingStatus.PENDING);
        verify(notificationService).notifyInstitutionAdmins(eq(1L), any(), any(), any(), any());
    }

    @Test
    void recurring_skipsConflictingWeek() {
        Hall hall = activeHall(institution());
        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        LocalDateTime first = LocalDateTime.now().plusDays(3).withHour(10).withMinute(0).withSecond(0).withNano(0);
        LocalDate until = first.toLocalDate().plusWeeks(2); // 3 occurrences
        // First occurrence conflicts, the rest are free.
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of(new Booking()))
                .thenReturn(List.of())
                .thenReturn(List.of());

        BookingService.RecurringResult result = bookingService.createRecurringBookings(
                user(1L), 2L, "Weekly Lecture", null, 40, first, first.plusHours(2), until);

        assertThat(result.created()).hasSize(2);
        assertThat(result.skipped()).hasSize(1);
        assertThat(result.skipped().get(0).reason()).contains("already booked");
    }
}
