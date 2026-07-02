package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class BookingService {

    private static final int FREE_TIER_MONTHLY_BOOKING_LIMIT = 20;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private HallRepository hallRepository;

    public Booking createBooking(Booking booking) {
        validateBookingWindow(booking.getStartTime(), booking.getEndTime());

        Hall hall = hallRepository.findById(booking.getHall().getId())
                .orElseThrow(() -> new IllegalArgumentException("Hall not found"));

        if (!hall.isActive()) {
            throw new IllegalArgumentException("This hall is not available for booking");
        }

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
        return bookingRepository.save(booking);
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
        return bookingRepository.save(booking);
    }

    public Booking rejectBooking(Long bookingId, User admin, String reason) {
        Booking booking = getBookingById(bookingId);
        booking.setStatus(BookingStatus.REJECTED);
        booking.setApprovedBy(admin);
        booking.setRejectionReason(reason);
        return bookingRepository.save(booking);
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
        return bookingRepository.save(booking);
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

    private void validateBookingWindow(LocalDateTime startTime, LocalDateTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (startTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Bookings cannot start in the past");
        }
    }

    private void enforceMonthlyBookingLimit(Institution institution, LocalDateTime bookingStart) {
        if (institution.getTier() == SubscriptionTier.FREE) {
            YearMonth targetMonth = YearMonth.from(bookingStart);
            LocalDateTime monthStart = targetMonth.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = targetMonth.plusMonths(1).atDay(1).atStartOfDay();

            long bookingCount = bookingRepository.countBookingsForInstitutionInRange(
                    institution.getId(), monthStart, monthEnd
            );

            if (bookingCount >= FREE_TIER_MONTHLY_BOOKING_LIMIT) {
                throw new SubscriptionLimitExceededException(
                        "Free tier allows a maximum of " + FREE_TIER_MONTHLY_BOOKING_LIMIT +
                        " bookings per month. Upgrade to Campus Pro for unlimited bookings."
                );
            }
        }
    }
}