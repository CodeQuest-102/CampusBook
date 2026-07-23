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

    long countByStatus(BookingStatus status);

    List<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status);

    /* ---- institution-scoped finders (multi-campus isolation) ---- */

    List<Booking> findByHallInstitutionIdOrderByCreatedAtDesc(Long institutionId);

    List<Booking> findByHallInstitutionIdAndStatusOrderByCreatedAtAsc(Long institutionId, BookingStatus status);

    List<Booking> findByHallInstitutionIdAndStartTimeBetween(
            Long institutionId, LocalDateTime start, LocalDateTime end);

    long countByHallInstitutionId(Long institutionId);

    long countByHallInstitutionIdAndStatus(Long institutionId, BookingStatus status);

    List<Booking> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);

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

    /**
     * The caller's own still-pending requests overlapping a window. Two people
     * may legitimately compete for the same slot — that's what the approval
     * queue decides — but the same person asking twice is a duplicate.
     */
    @Query("""
        SELECT b FROM Booking b
        WHERE b.hall.id = :hallId
        AND b.user.id = :userId
        AND b.id != :excludeBookingId
        AND b.status = 'PENDING'
        AND b.startTime < :endTime
        AND b.endTime > :startTime
    """)
    List<Booking> findOwnPendingOverlaps(
        @Param("hallId") Long hallId,
        @Param("userId") Long userId,
        @Param("excludeBookingId") Long excludeBookingId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * Everything still in play for a window — approved first, then pending
     * oldest-first. Shown to an admin so they can see what a request is up
     * against before deciding it.
     */
    @Query("""
        SELECT b FROM Booking b
        WHERE b.hall.id = :hallId
        AND b.id != :excludeBookingId
        AND b.status IN ('APPROVED', 'PENDING')
        AND b.startTime < :endTime
        AND b.endTime > :startTime
        ORDER BY b.status ASC, b.createdAt ASC
    """)
    List<Booking> findCompetingBookings(
        @Param("hallId") Long hallId,
        @Param("excludeBookingId") Long excludeBookingId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    @Query("""
    SELECT b FROM Booking b
    WHERE b.hall.id = :hallId
    AND b.status = 'APPROVED'
    AND b.startTime < :dayEnd
    AND b.endTime > :dayStart
    ORDER BY b.startTime ASC
    """)
    List<Booking> findApprovedBookingsForHallOnDate(
    @Param("hallId") Long hallId,
    @Param("dayStart") LocalDateTime dayStart,
    @Param("dayEnd") LocalDateTime dayEnd
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
