package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByStatus(BookingStatus status);

    List<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status);

    List<Booking> findByUserIdOrderByStartTimeDesc(Long userId);

    List<Booking> findByHallId(Long hallId);

    // This is the conflict-check query — finds overlapping APPROVED bookings for a hall
        @Query("""
        SELECT b FROM Booking b
        WHERE b.hall.id = :hallId
        AND b.id != :excludeBookingId
        AND b.status = 'APPROVED'
        AND b.startTime < :endTime
        AND b.endTime > :startTime
    """)
    List<Booking> findOverlappingBookings(
        @Param("hallId") Long hallId,
        @Param("excludeBookingId") Long excludeBookingId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    @Query("""
    SELECT COUNT(b) FROM Booking b
    WHERE b.hall.institution.id = :institutionId
    AND b.startTime BETWEEN :monthStart AND :monthEnd
    """)
    long countBookingsForInstitutionInRange(
    @Param("institutionId") Long institutionId,
    @Param("monthStart") LocalDateTime monthStart,
    @Param("monthEnd") LocalDateTime monthEnd
);
}
