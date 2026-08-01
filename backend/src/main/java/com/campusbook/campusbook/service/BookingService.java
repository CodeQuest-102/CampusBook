package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.BookingAudit;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingAuditAction;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.NotificationType;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.BookingAuditRepository;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.dto.RecurringBookingResponse;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
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

    @Autowired
    private BookingAuditRepository bookingAuditRepository;

    /**
     * Self-reference so bulk operations (which call approveBooking/rejectBooking
     * on `this`) still go through the Spring proxy and get @Transactional
     * applied — a plain `this.approveBooking(...)` call bypasses the proxy
     * entirely and silently drops the transaction boundary. @Lazy breaks the
     * circular-bean-creation this would otherwise cause.
     */
    @Autowired
    @Lazy
    private BookingService self;

    /**
     * Status change, its audit entry, and the resulting notification all
     * succeed together or not at all — a failure partway through (e.g. the
     * audit write) used to leave a booking committed in its new state with no
     * audit trail and no notification sent, with nothing to catch it.
     */
    @Transactional
    public Booking createBooking(Booking booking) {
        validateBookingWindow(booking.getStartTime(), booking.getEndTime());

        Hall hall = hallRepository.findById(booking.getHall().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Hall not found"));

        if (!hall.isActive()) {
            throw new IllegalArgumentException("This hall is not available for booking");
        }

        // A user may only book rooms at their own campus — the hall id is client
        // input on an authenticated endpoint, so it can't be trusted to be local.
        assertSameInstitution(hall, booking.getUser());

        validateAttendanceFitsHall(booking.getAttendance(), hall);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
            hall.getId(),
            -1L,
            booking.getStartTime(),
            booking.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(describeConflict(hall, conflicts.get(0)));
        }

        assertNoDuplicateRequest(hall, booking.getUser(), -1L,
                booking.getStartTime(), booking.getEndTime());

        enforceMonthlyBookingLimit(hall.getInstitution(), booking.getStartTime());

        booking.setHall(hall);
        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);

        audit(saved.getId(), saved.getUser(), BookingAuditAction.CREATED,
                "Requested " + hall.getBlock() + " " + hall.getRoomCode());

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
                .orElseThrow(() -> new ResourceNotFoundException("Hall not found"));
        if (!hall.isActive()) {
            throw new IllegalArgumentException("This hall is not available for booking");
        }

        assertSameInstitution(hall, user);

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
                assertNoDuplicateRequest(hall, user, -1L, start, end);
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
                Booking savedOccurrence = bookingRepository.save(b);
                created.add(savedOccurrence);

                audit(savedOccurrence.getId(), user, BookingAuditAction.CREATED,
                        "Requested as part of a weekly series");
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

    /** @see #createBooking for why this is transactional. */
    @Transactional
    public Booking approveBooking(Long bookingId, User admin) {
        Booking booking = getBookingById(bookingId);
        assertSameInstitution(booking.getHall(), admin);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
            booking.getHall().getId(),
            booking.getId(),
            booking.getStartTime(),
            booking.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(describeConflict(booking.getHall(), conflicts.get(0)));
        }

        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedBy(admin);
        Booking saved = saveApproval(booking);

        audit(saved.getId(), admin, BookingAuditAction.APPROVED, null);

        notificationService.notifyUser(
            saved.getUser(),
            NotificationType.BOOKING_APPROVED,
            "Booking approved",
            "Your booking for " + saved.getHall().getBlock() + " " + saved.getHall().getRoomCode() + " was approved",
            saved.getId()
        );

        return saved;
    }

    private static final String OVERLAP_CONSTRAINT = "excl_bookings_hall_time_overlap";

    /**
     * Saves an approval. The conflict check above is a fast-path convenience —
     * a DB-level exclusion constraint on `bookings` is what actually prevents two
     * concurrent approvals for the same slot; this translates a constraint hit
     * into the same conflict error the fast-path check throws, so a losing
     * concurrent approval reads like any other conflict rather than a 500.
     */
    private Booking saveApproval(Booking booking) {
        try {
            return bookingRepository.save(booking);
        } catch (DataIntegrityViolationException e) {
            String cause = e.getMostSpecificCause().getMessage();
            if (cause != null && cause.contains(OVERLAP_CONSTRAINT)) {
                throw new IllegalStateException(
                        roomLabel(booking.getHall()) + " was just booked for this time by someone else. Refresh and try again.");
            }
            throw e;
        }
    }

    /** @see #createBooking for why this is transactional. */
    @Transactional
    public Booking rejectBooking(Long bookingId, User admin, String reason) {
        Booking booking = getBookingById(bookingId);
        assertSameInstitution(booking.getHall(), admin);
        booking.setStatus(BookingStatus.REJECTED);
        booking.setApprovedBy(admin);
        booking.setRejectionReason(reason);
        Booking saved = bookingRepository.save(booking);

        audit(saved.getId(), admin, BookingAuditAction.REJECTED, reason);

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

    /** @see #createBooking for why this is transactional. */
    @Transactional
    public Booking cancelBooking(Long bookingId, User actor) {
        Booking booking = getBookingById(bookingId);
        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");

        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only cancel your own bookings");
        }
        // An admin cancelling someone else's booking may only reach their own campus.
        if (isAdmin && !ownsBooking) {
            assertSameInstitution(booking.getHall(), actor);
        }

        if (booking.getEndTime().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Past bookings cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);

        audit(saved.getId(), actor, BookingAuditAction.CANCELLED,
                isAdmin && !ownsBooking ? "Cancelled by an administrator" : null);

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

    /** @see #createBooking for why this is transactional. */
    @Transactional
    public Booking rescheduleBooking(Long bookingId, User actor, LocalDateTime newStart, LocalDateTime newEnd) {
        Booking booking = getBookingById(bookingId);

        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");
        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only reschedule your own bookings");
        }
        if (isAdmin && !ownsBooking) {
            assertSameInstitution(booking.getHall(), actor);
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cancelled bookings cannot be rescheduled");
        }

        validateBookingWindow(newStart, newEnd);

        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
                booking.getHall().getId(), booking.getId(), newStart, newEnd);
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(describeConflict(booking.getHall(), conflicts.get(0)));
        }

        assertNoDuplicateRequest(booking.getHall(), booking.getUser(), booking.getId(), newStart, newEnd);

        booking.setStartTime(newStart);
        booking.setEndTime(newEnd);
        // A time change requires fresh approval.
        booking.setStatus(BookingStatus.PENDING);
        booking.setApprovedBy(null);
        booking.setRejectionReason(null);
        Booking saved = bookingRepository.save(booking);

        audit(saved.getId(), actor, BookingAuditAction.RESCHEDULED,
                "Moved to " + newStart + " – " + newEnd + "; awaiting re-approval");

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
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
    }

    /** Admin view — every booking at the actor's institution, newest first. */
    public List<Booking> getAllBookings(User actor) {
        return bookingRepository.findByHallInstitutionIdOrderByCreatedAtDesc(
                actor.getInstitution().getId());
    }

    /** Admin view — bookings in a given status at the actor's institution. */
    public List<Booking> getBookingsByStatus(User actor, BookingStatus status) {
        return bookingRepository.findByHallInstitutionIdAndStatusOrderByCreatedAtAsc(
                actor.getInstitution().getId(), status);
    }

    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByStartTimeDesc(userId);
    }

    /**
     * A booking's history, oldest first, for a caller allowed to see it: the
     * person who booked it, or an admin at the booking's own institution.
     */
    public List<BookingAudit> getHistoryFor(Long bookingId, User actor) {
        Booking booking = getBookingById(bookingId);

        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");
        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only view the history of your own bookings");
        }
        if (isAdmin && !ownsBooking) {
            assertSameInstitution(booking.getHall(), actor);
        }

        return bookingAuditRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
    }

    /**
     * A single booking, for a caller allowed to see it: its owner, or an admin at
     * the booking's institution.
     */
    public Booking getBookingFor(Long bookingId, User actor) {
        Booking booking = getBookingById(bookingId);

        boolean ownsBooking = booking.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().name().equals("ADMIN");
        if (!ownsBooking && !isAdmin) {
            throw new SecurityException("You can only view your own bookings");
        }
        if (isAdmin && !ownsBooking) {
            assertSameInstitution(booking.getHall(), actor);
        }
        return booking;
    }

    /** A user's APPROVED bookings — what belongs in a calendar feed. */
    public List<Booking> getApprovedBookingsByUser(Long userId) {
        return bookingRepository.findByUserIdOrderByStartTimeDesc(userId).stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .toList();
    }

    /**
     * Approved and still-pending bookings competing with this one for its room
     * and window. Lets an admin see what a request is up against — including
     * the rival requests that made it into the queue alongside it.
     */
    public List<Booking> getConflictsFor(Long bookingId, User admin) {
        Booking booking = getBookingById(bookingId);
        assertSameInstitution(booking.getHall(), admin);

        return bookingRepository.findCompetingBookings(
                booking.getHall().getId(),
                booking.getId(),
                booking.getStartTime(),
                booking.getEndTime());
    }

    /** Why one id in a bulk action didn't go through. */
    public record BulkFailure(Long id, String reason) {}

    /** Outcome of a bulk action, per id. */
    public record BulkResult(List<Long> succeeded, List<BulkFailure> failed) {}

    /**
     * Approve many bookings, reporting each id's outcome rather than a single
     * status. Approval legitimately fails per booking — most often because
     * another approval already took the slot — and collapsing that into one
     * error would hide which ones didn't make it.
     *
     * <p>Each id is attempted independently, and each one's own status change +
     * audit + notification is still atomic (via {@link #self}, so the call goes
     * through the transactional proxy) — but nothing here wraps the whole batch,
     * so a failure on one id leaves earlier successes committed rather than
     * rolling back the batch.
     */
    public BulkResult approveAll(List<Long> ids, User admin) {
        return applyToEach(ids, id -> self.approveBooking(id, admin));
    }

    /** Reject many bookings with a shared reason. See {@link #approveAll}. */
    public BulkResult rejectAll(List<Long> ids, User admin, String reason) {
        return applyToEach(ids, id -> self.rejectBooking(id, admin, reason));
    }

    private BulkResult applyToEach(List<Long> ids, java.util.function.Consumer<Long> action) {
        List<Long> succeeded = new ArrayList<>();
        List<BulkFailure> failed = new ArrayList<>();

        for (Long id : ids) {
            try {
                action.accept(id);
                succeeded.add(id);
            } catch (RuntimeException e) {
                String reason = e.getMessage() == null ? "Could not be processed" : e.getMessage();
                failed.add(new BulkFailure(id, reason));
            }
        }
        return new BulkResult(succeeded, failed);
    }

    /**
     * Append one entry to a booking's history. Called at the same points that
     * already fire notifications, so the trail covers every state change.
     */
    private void audit(Long bookingId, User actor, BookingAuditAction action, String details) {
        BookingAudit entry = new BookingAudit();
        entry.setBookingId(bookingId);
        entry.setActor(actor);
        entry.setAction(action);
        entry.setDetails(details);
        entry.setCreatedAt(LocalDateTime.now());
        bookingAuditRepository.save(entry);
    }

    /**
     * A booking's hall fixes its institution. An admin (or booker) may only act
     * on bookings and rooms at their own campus; anything else is a 403.
     */
    private void assertSameInstitution(Hall hall, User actor) {
        if (!hall.getInstitution().getId().equals(actor.getInstitution().getId())) {
            throw new SecurityException("This resource belongs to another institution");
        }
    }

    /**
     * Two people asking for the same slot is a decision for the approval queue,
     * but one person asking twice is a duplicate — it can't be approved (the
     * second attempt would collide with the first) and it clutters the queue.
     */
    private void assertNoDuplicateRequest(Hall hall, User user, Long excludeBookingId,
                                          LocalDateTime start, LocalDateTime end) {
        List<Booking> own = bookingRepository.findOwnPendingOverlaps(
                hall.getId(), user.getId(), excludeBookingId, start, end);
        if (!own.isEmpty()) {
            Booking existing = own.get(0);
            throw new IllegalStateException(
                    "You already have a pending request for " + roomLabel(hall) + " at "
                            + TIME.format(existing.getStartTime()) + "–" + TIME.format(existing.getEndTime())
                            + " that day. Wait for it to be decided, or cancel it first.");
        }
    }

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a");

    private static String roomLabel(Hall hall) {
        return hall.getBlock() + " " + hall.getRoomCode();
    }

    /**
     * Names the booking holding the slot. An admin hitting this needs to know
     * <em>which</em> booking is in the way to decide what to do about it — the
     * bare "already booked" left them with nothing to act on.
     */
    private String describeConflict(Hall hall, Booking holder) {
        return roomLabel(hall) + " is already booked "
                + TIME.format(holder.getStartTime()) + "–" + TIME.format(holder.getEndTime())
                + " by " + holder.getUser().getFullName();
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