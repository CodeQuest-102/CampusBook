package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.BookingAuditResponse;
import com.campusbook.campusbook.dto.BookingRequest;
import com.campusbook.campusbook.dto.BookingResponse;
import com.campusbook.campusbook.dto.BulkActionResponse;
import com.campusbook.campusbook.dto.BulkBookingRequest;
import com.campusbook.campusbook.dto.RecurringBookingRequest;
import com.campusbook.campusbook.dto.RecurringBookingResponse;
import com.campusbook.campusbook.dto.RejectBookingRequest;
import com.campusbook.campusbook.dto.RescheduleRequest;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping
    public ResponseEntity<?> createBooking(@AuthenticationPrincipal User user,
                                        @Valid @RequestBody BookingRequest request) {
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setHall(hallReference(request.getHallId()));
        booking.setPurpose(request.getPurpose());
        booking.setNotes(request.getNotes());
        booking.setAttendance(request.getAttendance());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());

        return ResponseEntity.ok(BookingResponse.from(bookingService.createBooking(booking)));
    }

    @PostMapping("/recurring")
    public ResponseEntity<RecurringBookingResponse> createRecurring(@AuthenticationPrincipal User user,
                                                                    @Valid @RequestBody RecurringBookingRequest request) {
        BookingService.RecurringResult result = bookingService.createRecurringBookings(
                user, request.getHallId(), request.getPurpose(), request.getNotes(),
                request.getAttendance(), request.getStartTime(), request.getEndTime(), request.getUntil());

        List<BookingResponse> created = result.created().stream().map(BookingResponse::from).toList();
        return ResponseEntity.ok(new RecurringBookingResponse(
                created.size() + result.skipped().size(), created, result.skipped()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> getMyBookings(@AuthenticationPrincipal User user) {
        List<BookingResponse> bookings = bookingService.getBookingsByUser(user.getId()).stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAllBookings(@AuthenticationPrincipal User user) {
        List<BookingResponse> bookings = bookingService.getAllBookings(user).stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<BookingResponse>> getPendingBookings(@AuthenticationPrincipal User user) {
        List<BookingResponse> bookings = bookingService.getBookingsByStatus(user, BookingStatus.PENDING).stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveBooking(@AuthenticationPrincipal User user,
                                            @PathVariable Long id) {
        return ResponseEntity.ok(BookingResponse.from(bookingService.approveBooking(id, user)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(@AuthenticationPrincipal User user,
                                            @PathVariable Long id,
                                            @RequestBody(required = false) RejectBookingRequest request) {
        String reason = request == null ? null : request.getReason();
        return ResponseEntity.ok(BookingResponse.from(bookingService.rejectBooking(id, user, reason)));
    }

    /**
     * Approve several pending requests at once. Returns each id's outcome —
     * some may fail (e.g. the slot was taken) while others succeed.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/bulk-approve")
    public ResponseEntity<BulkActionResponse> bulkApprove(@AuthenticationPrincipal User user,
                                                          @Valid @RequestBody BulkBookingRequest request) {
        return ResponseEntity.ok(BulkActionResponse.from(
                bookingService.approveAll(request.getIds(), user)));
    }

    /** Reject several pending requests at once with a shared reason. */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/bulk-reject")
    public ResponseEntity<BulkActionResponse> bulkReject(@AuthenticationPrincipal User user,
                                                         @Valid @RequestBody BulkBookingRequest request) {
        return ResponseEntity.ok(BulkActionResponse.from(
                bookingService.rejectAll(request.getIds(), user, request.getReason())));
    }

    /** A booking's audit trail. Visible to the booker and to admins at its institution. */
    @GetMapping("/{id}/history")
    public ResponseEntity<List<BookingAuditResponse>> getHistory(@AuthenticationPrincipal User user,
                                                                 @PathVariable Long id) {
        List<BookingAuditResponse> history = bookingService.getHistoryFor(id, user).stream()
                .map(BookingAuditResponse::from)
                .toList();
        return ResponseEntity.ok(history);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@AuthenticationPrincipal User user,
                                            @PathVariable Long id) {
        return ResponseEntity.ok(BookingResponse.from(bookingService.cancelBooking(id, user)));
    }

    @PutMapping("/{id}/reschedule")
    public ResponseEntity<?> rescheduleBooking(@AuthenticationPrincipal User user,
                                               @PathVariable Long id,
                                               @Valid @RequestBody RescheduleRequest request) {
        return ResponseEntity.ok(BookingResponse.from(
                bookingService.rescheduleBooking(id, user, request.getStartTime(), request.getEndTime())));
    }

    private Hall hallReference(Long hallId) {
        Hall hall = new Hall();
        hall.setId(hallId);
        return hall;
    }
}