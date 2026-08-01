package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingAuditAction;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.repository.BookingAuditRepository;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
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
    @Mock BookingAuditRepository bookingAuditRepository;

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
        return user(id, institution());
    }

    private User user(long id, Institution institution) {
        User u = new User();
        u.setId(id);
        u.setFullName("Test User");
        u.setRole(Role.STUDENT_LEADER);
        u.setInstitution(institution);
        return u;
    }

    private Institution otherInstitution() {
        Institution i = new Institution();
        i.setId(99L);
        i.setName("Other Campus");
        i.setTier(SubscriptionTier.FREE);
        return i;
    }

    /**
     * A booking already holding a slot. Times and a requester are always present
     * on a real one, and the conflict message names both, so a bare stub here
     * would be testing something that can't occur.
     */
    private Booking holder(Hall hall, String requesterName, LocalDateTime start, LocalDateTime end) {
        User owner = user(77L, hall.getInstitution());
        owner.setFullName(requesterName);
        Booking b = booking(hall, owner, start, end);
        b.setId(99L);
        b.setStatus(BookingStatus.APPROVED);
        return b;
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

    /**
     * A missing hall is a 404 (nothing there to act on), not a 400 like the
     * validation failures below — the two used to share IllegalArgumentException
     * and collapse into the same wrong status code.
     */
    @Test
    void createBooking_throwsNotFoundWhenTheHallDoesNotExist() {
        Booking b = booking(activeHall(institution()), user(1L),
                LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Hall not found");
    }

    @Test
    void getBookingById_throwsNotFoundWhenTheBookingDoesNotExist() {
        when(bookingRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.getBookingById(404L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void createBooking_rejectsOverlappingSlot() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, user(1L), start, start.plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of(holder(hall, "Ama Mensah", start, start.plusHours(2))));

        // The message names the room and who holds it — an admin hitting this on
        // approval needs to know which booking is in the way to act on it.
        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already booked")
                .hasMessageContaining("Science Complex Block GF1")
                .hasMessageContaining("Ama Mensah");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_rejectsASecondPendingRequestFromTheSamePerson() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User requester = user(1L, inst);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, requester, start, start.plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findOwnPendingOverlaps(eq(2L), eq(1L), anyLong(), any(), any()))
                .thenReturn(List.of(booking(hall, requester, start, start.plusHours(2))));

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already have a pending request");

        verify(bookingRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    /**
     * Two people wanting the same slot is a decision for the approval queue, not
     * a race the first requester wins outright — only a duplicate from the same
     * person is refused.
     */
    @Test
    void createBooking_allowsADifferentPersonToRequestTheSameSlot() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, user(2L, inst), start, start.plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        // Someone else's pending request doesn't show up in *this* user's lookup.
        when(bookingRepository.findOwnPendingOverlaps(eq(2L), eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        Booking saved = bookingService.createBooking(b);

        assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDING);
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void createBooking_rejectsMoreAttendeesThanTheHallSeats() {
        Hall hall = activeHall(institution());
        hall.setCapacity(30);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, user(1L), start, start.plusHours(2));
        b.setAttendance(31);

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("seats 30");

        verify(bookingRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void createBooking_allowsAttendanceUpToCapacity() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        hall.setCapacity(30);
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, user(1L), start, start.plusHours(2));
        b.setAttendance(30); // exactly full is fine

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(bookingService.createBooking(b).getAttendance()).isEqualTo(30);
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
    void approve_rejectsAdminFromAnotherInstitution() {
        Hall hall = activeHall(institution()); // institution id 1
        Booking pending = booking(hall, user(1L),
                LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(pending));

        User foreignAdmin = user(50L, otherInstitution()); // institution id 99
        foreignAdmin.setRole(Role.ADMIN);

        assertThatThrownBy(() -> bookingService.approveBooking(10L, foreignAdmin))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("another institution");

        verify(bookingRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    /**
     * The fast-path conflict check above can't see this — it only queries
     * already-APPROVED bookings, so two concurrent approvals of different
     * PENDING requests both pass it. The DB's exclusion constraint is what
     * actually catches the second one, surfacing here as a save() failure
     * that must read like the ordinary conflict error, not a 500.
     */
    @Test
    void approveBooking_translatesOverlapConstraintViolationIntoConflictError() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User admin = user(50L, inst);
        admin.setRole(Role.ADMIN);
        Booking pending = booking(hall, user(1L, inst), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(pending));
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(10L), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenThrow(new DataIntegrityViolationException(
                "ERROR: conflicting key value violates exclusion constraint \"excl_bookings_hall_time_overlap\""));

        assertThatThrownBy(() -> bookingService.approveBooking(10L, admin))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("was just booked");
    }

    @Test
    void approveBooking_rethrowsUnrelatedDataIntegrityViolations() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User admin = user(50L, inst);
        admin.setRole(Role.ADMIN);
        Booking pending = booking(hall, user(1L, inst), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(pending));
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(10L), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenThrow(new DataIntegrityViolationException(
                "ERROR: null value in column \"hall_id\" violates not-null constraint"));

        assertThatThrownBy(() -> bookingService.approveBooking(10L, admin))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void createBooking_rejectsHallAtAnotherInstitution() {
        Hall hall = activeHall(institution()); // institution id 1
        User foreignUser = user(7L, otherInstitution()); // institution id 99
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        Booking b = booking(hall, foreignUser, start, start.plusHours(2));

        when(hallRepository.findById(2L)).thenReturn(Optional.of(hall));

        assertThatThrownBy(() -> bookingService.createBooking(b))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("another institution");

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void bulkApprove_reportsPerIdOutcomeInsteadOfFailingWholesale() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User admin = user(50L, inst);
        admin.setRole(Role.ADMIN);

        Booking first = booking(hall, user(1L), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));
        Booking second = booking(hall, user(2L), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));
        second.setId(11L);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(first));
        when(bookingRepository.findById(11L)).thenReturn(Optional.of(second));
        // The first approval succeeds; the second finds the slot taken.
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(10L), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(11L), any(), any()))
                .thenReturn(List.of(holder(hall, "Ama Mensah",
                        LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2))));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        BookingService.BulkResult result = bookingService.approveAll(List.of(10L, 11L), admin);

        assertThat(result.succeeded()).containsExactly(10L);
        assertThat(result.failed()).hasSize(1);
        assertThat(result.failed().get(0).id()).isEqualTo(11L);
        assertThat(result.failed().get(0).reason()).contains("already booked");
        // The successful one still went through — one failure doesn't undo the batch.
        assertThat(first.getStatus()).isEqualTo(BookingStatus.APPROVED);
        assertThat(second.getStatus()).isEqualTo(BookingStatus.PENDING);
    }

    @Test
    void bulkApprove_recordsAnAuditEntryPerSuccess() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User admin = user(50L, inst);
        admin.setRole(Role.ADMIN);

        Booking pending = booking(hall, user(1L), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));
        when(bookingRepository.findById(10L)).thenReturn(Optional.of(pending));
        when(bookingRepository.findOverlappingBookings(eq(2L), eq(10L), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        bookingService.approveAll(List.of(10L), admin);

        verify(bookingAuditRepository).save(argThat(a ->
                a.getAction() == BookingAuditAction.APPROVED
                        && a.getBookingId().equals(10L)
                        && a.getActor().getId().equals(50L)));
    }

    /**
     * Same race as approveBooking_translatesOverlapConstraintViolationIntoConflictError,
     * but through bulk-approve — the per-request-outcome contract must hold even
     * when the failure comes from the DB constraint rather than the fast-path check.
     */
    @Test
    void bulkApprove_reportsOverlapConstraintHitAsPerIdFailure() {
        Institution inst = institution();
        Hall hall = activeHall(inst);
        User admin = user(50L, inst);
        admin.setRole(Role.ADMIN);

        Booking first = booking(hall, user(1L), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));
        Booking second = booking(hall, user(2L), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2));
        second.setId(11L);

        when(bookingRepository.findById(10L)).thenReturn(Optional.of(first));
        when(bookingRepository.findById(11L)).thenReturn(Optional.of(second));
        // Both pass the fast-path check (neither is APPROVED yet) — this is the
        // race the exclusion constraint exists to catch.
        when(bookingRepository.findOverlappingBookings(eq(2L), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            if (b.getId().equals(11L)) {
                throw new DataIntegrityViolationException(
                        "ERROR: conflicting key value violates exclusion constraint \"excl_bookings_hall_time_overlap\"");
            }
            return b;
        });

        BookingService.BulkResult result = bookingService.approveAll(List.of(10L, 11L), admin);

        assertThat(result.succeeded()).containsExactly(10L);
        assertThat(result.failed()).hasSize(1);
        assertThat(result.failed().get(0).id()).isEqualTo(11L);
        assertThat(result.failed().get(0).reason()).contains("was just booked");
        assertThat(first.getStatus()).isEqualTo(BookingStatus.APPROVED);
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
