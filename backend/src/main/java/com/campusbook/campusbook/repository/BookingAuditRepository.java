package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.BookingAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingAuditRepository extends JpaRepository<BookingAudit, Long> {

    /** A booking's history, oldest first — the order it reads as a timeline. */
    List<BookingAudit> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
}
