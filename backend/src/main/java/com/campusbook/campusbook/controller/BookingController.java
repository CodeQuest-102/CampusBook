package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.BookingRequest;
import com.campusbook.campusbook.dto.BookingResponse;
import com.campusbook.campusbook.dto.RejectBookingRequest;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
        try {
            Booking booking = new Booking();
            booking.setUser(user);
            booking.setHall(hallReference(request.getHallId()));
            booking.setPurpose(request.getPurpose());
            booking.setStartTime(request.getStartTime());
            booking.setEndTime(request.getEndTime());

            return ResponseEntity.ok(BookingResponse.from(bookingService.createBooking(booking)));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> getMyBookings(@AuthenticationPrincipal User user) {
        List<BookingResponse> bookings = bookingService.getBookingsByUser(user.getId()).stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @GetMapping
    public ResponseEntity<?> getAllBookings(@AuthenticationPrincipal User user) {
        if (!isAdmin(user)) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        List<BookingResponse> bookings = bookingService.getAllBookings().stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingBookings(@AuthenticationPrincipal User user) {
        if (!isAdmin(user)) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        List<BookingResponse> bookings = bookingService.getBookingsByStatus(BookingStatus.PENDING).stream()
                .map(BookingResponse::from)
                .toList();
        return ResponseEntity.ok(bookings);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveBooking(@AuthenticationPrincipal User user,
                                            @PathVariable Long id) {
        if (!isAdmin(user)) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        try {
            return ResponseEntity.ok(BookingResponse.from(bookingService.approveBooking(id, user)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(@AuthenticationPrincipal User user,
                                           @PathVariable Long id,
                                           @RequestBody(required = false) RejectBookingRequest request) {
        if (!isAdmin(user)) {
            return ResponseEntity.status(403).body("Admin access required");
        }

        String reason = request == null ? null : request.getReason();

        try {
            return ResponseEntity.ok(BookingResponse.from(bookingService.rejectBooking(id, user, reason)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@AuthenticationPrincipal User user,
                                           @PathVariable Long id) {
        try {
            return ResponseEntity.ok(BookingResponse.from(bookingService.cancelBooking(id, user)));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private Hall hallReference(Long hallId) {
        Hall hall = new Hall();
        hall.setId(hallId);
        return hall;
    }

    private boolean isAdmin(User user) {
        return user != null && user.getRole() == Role.ADMIN;
    }
}
