package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.NotificationType;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.dto.RecurringBookingResponse;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SubscriptionCatalog subscriptionCatalog;

    public Booking createBooking(Booking booking) {
        validateBookingWindow(booking.getStartTime(), booking.getEndTime());

        Hall hall = hallRepository.findById(booking.getHall().getId())
                .orElseThrow(() -> new IllegalArgumentException("Hall not found"));

        if (!hall.isActive()) {
            throw new IllegalArgumentException("This hall is not available for booking");
        }

        validateAttendanceFitsHall(booking.getAttendance(), hall);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
            hall.getId(),
            -1L,
            booking.getStartTime(),
            booking.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("This hall is already booked for an overlapping time slot");
        }

        enforceMonthlyBookingLimit(hall.getInstitution(), booking.getStartTime());

        booking.setHall(hall);
        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);

        notificationService.notifyInstitutionAdmins(
            hall.getInstitution().getId(),
            NotificationType.NEW_BOOKING_REQUEST,
            "New booking request",
            saved.getUser().getFullName() + " requested " + hall.getBlock() + " " + hall.getRoomCode() + " for " + saved.getPurpose(),
            saved.getId()
        );

        return saved;
    }

    /** Created bookings plus the occurrences that were skipped and why. */
    public record RecurringResult(List<Booking> created,
                                  List<RecurringBookingResponse.SkippedOccurrence> skipped) {}

    /** Max occurrences a single series may generate (~14 months of weekly slots). */
    private static final int MAX_OCCURRENCES = 60;

    /**
     * Create a weekly series from {@code firstStart}/{@code firstEnd} until {@code until}
     * (inclusive). Each occurrence reuses the same window / conflict / limit checks as a
     * single booking; occurrences that fail any check are skipped (with a reason) rather
     * than aborting the whole series. Admins get one summary notification.
     */
    public RecurringResult createRecurringBookings(User user, Long hallId, String purpose,
                                                   String notes, Integer attendance,
                                                   LocalDateTime firstStart, LocalDateTime firstEnd,
                                                   LocalDate until) {
        if (!firstStart.isBefore(firstEnd)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (until.isBefore(firstStart.toLocalDate())) {
            throw new IllegalArgumentException("End date must be on or after the first occurrence");
        }

        Hall hall = hallRepository.findById(hallId)
                .orElseThrow(() -> new IllegalArgumentException("Hall not found"));
        if (!hall.isActive()) {
            throw new IllegalArgumentException("This hall is not available for booking");
        }

        // Checked once for the whole series: the hall and headcount don't vary
        // per occurrence, so skipping each one for the same reason is pointless.
        validateAttendanceFitsHall(attendance, hall);

        Duration duration = Duration.between(firstStart, firstEnd);
        List<Booking> created = new ArrayList<>();
        List<RecurringBookingResponse.SkippedOccurrence> skipped = new ArrayList<>();

        LocalDateTime start = firstStart;
        int count = 0;
        while (!start.toLocalDate().isAfter(until) && count < MAX_OCCURRENCES) {
            count++;
            LocalDateTime end = start.plus(duration);
            LocalDate date = start.toLocalDate();
            try {
                validateBookingWindow(start, end);
                List<Booking> conflicts = bookingRepository.findOverlappingBookings(hall.getId(), -1L, start, end);
                if (!conflicts.isEmpty()) {
                    throw new IllegalStateException("Hall already booked for this slot");
                }
                enforceMonthlyBookingLimit(hall.getInstitution(), start);

                Booking b = new Booking();
                b.setUser(user);
                b.setHall(hall);
                b.setPurpose(purpose);
                b.setNotes(notes);
                b.setAttendance(attendance);
                b.setStartTime(start);
                b.setEndTime(end);
                b.setStatus(BookingStatus.PENDING);
                created.add(bookingRepository.save(b));
            } catch (IllegalArgumentException | IllegalStateException | SubscriptionLimitExceededException e) {
                skipped.add(new RecurringBookingResponse.SkippedOccurrence(date, e.getMessage()));
            }
            start = start.plusWeeks(1);
        }

        if (!created.isEmpty()) {
            notificationService.notifyInstitutionAdmins(
                    hall.getInstitution().getId(),
                    NotificationType.NEW_BOOKING_REQUEST,
                    "New recurring booking request",
                    user.getFullName() + " requested " + created.size() + " weekly slots for "
                            + hall.getBlock() + " " + hall.getRoomCode() + " (" + purpose + ")",
                    created.get(0).getId()
            );
        }

        return new RecurringResult(created, skipped);
    }

    public Booking approveBooking(Long bookingId, User admin) {
        Booking booking = getBookingById(bookingId);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
            booking.getHall().getId(),
            booking.getId(),
            booking.getStartTime(),
            booking.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("This hall is already booked for an overlapping time slot");
        }

        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedBy(admin);
        Booking saved = bookingRepository.save(booking);

        notificationService.notifyUser(
            saved.getUser(),
            NotificationType.BOOKING_APPROVED,
            "Booking approved",
            "Your booking for " + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode() + " was approved",
            saved.getId()
        );

        return saved;
    }

    public Booking rejectBooking(Long bookingId, User admin, String reason) {
        Booking booking = getBookingById(bookingId);
        booking.setStatus(BookingStatus.REJECTED);
        booking.setApprovedBy(admin);
        booking.setRejectionReason(reason);
        Booking saved = bookingRepository.save(booking);

        notificationService.notifyUser(
            saved.getUser(),
            NotificationType.BOOKING_REJECTED,
            "Booking rejected",
            "Your booking for " + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode() +
                (reason != null ? " was rejected: " + reason : " was rejected"),
            saved.getId()
        );

        return saved;
    }

    public Booking cancelBooking(Long bookingId, User actor) {
        Booking booking = getBookingById(bookingId);
        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");

        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only cancel your own bookings");
        }

        if (booking.getEndTime().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Past bookings cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);

        if (isAdmin && !ownsBooking) {
            notificationService.notifyUser(
                saved.getUser(),
                NotificationType.BOOKING_CANCELLED,
                "Booking cancelled",
                "Your booking for " + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode() + " was cancelled by an admin",
                saved.getId()
            );
        } else {
            notificationService.notifyInstitutionAdmins(
                saved.getHall().getInstitution().getId(),
                NotificationType.BOOKING_CANCELLED,
                "Booking cancelled",
                saved.getUser().getFullName() + " cancelled their booking for " + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode(),
                saved.getId()
            );
        }

        return saved;
    }

    public Booking rescheduleBooking(Long bookingId, User actor, LocalDateTime newStart, LocalDateTime newEnd) {
        Booking booking = getBookingById(bookingId);

        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");
        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only reschedule your own bookings");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cancelled bookings cannot be rescheduled");
        }

        validateBookingWindow(newStart, newEnd);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
                booking.getHall().getId(), booking.getId(), newStart, newEnd);
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException("This hall is already booked for an overlapping time slot");
        }

        booking.setStartTime(newStart);
        booking.setEndTime(newEnd);
        // A time change requires fresh approval.
        booking.setStatus(BookingStatus.PENDING);
        booking.setApprovedBy(null);
        booking.setRejectionReason(null);
        Booking saved = bookingRepository.save(booking);

        notificationService.notifyInstitutionAdmins(
                saved.getHall().getInstitution().getId(),
                NotificationType.NEW_BOOKING_REQUEST,
                "Booking rescheduled",
                saved.getUser().getFullName() + " rescheduled their booking for "
                        + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode(),
                saved.getId()
        );

        return saved;
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public List<Booking> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatusOrderByCreatedAtAsc(status);
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByStartTimeDesc(userId);
    }

    /**
     * Attendance is optional, but a stated headcount can't exceed what the room
     * seats. Capacity lives on the hall, so this can't be a DTO constraint.
     */
    private void validateAttendanceFitsHall(Integer attendance, Hall hall) {
        // Capacity is a nullable column, so a hall with none recorded can't
        // contradict any headcount — and unboxing it blindly would be an NPE.
        if (attendance != null && hall.getCapacity() != null && attendance > hall.getCapacity()) {
            throw new IllegalArgumentException(
                    hall.getBlock() + " " + hall.getRoomCode() + " seats " + hall.getCapacity()
                            + ", but " + attendance + " attendees were expected");
        }
    }

    private void validateBookingWindow(LocalDateTime startTime, LocalDateTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (startTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Bookings cannot start in the past");
        }
    }

    private void enforceMonthlyBookingLimit(Institution institution, LocalDateTime bookingStart) {
        Integer limit = subscriptionCatalog.forTier(institution.getTier()).monthlyBookingLimit();
        if (limit == null) return; // unlimited tier

        YearMonth targetMonth = YearMonth.from(bookingStart);
        LocalDateTime monthStart = targetMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = targetMonth.plusMonths(1).atDay(1).atStartOfDay();

        long bookingCount = bookingRepository.countBookingsForInstitutionInRange(
                institution.getId(), monthStart, monthEnd
        );

        if (bookingCount >= limit) {
            throw new SubscriptionLimitExceededException(
                    "Your plan allows a maximum of " + limit +
                    " bookings per month. Upgrade to Campus Pro for unlimited bookings."
            );
        }
    }
}