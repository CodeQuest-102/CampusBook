package com.campusbook.campusbook.entity;

import com.campusbook.campusbook.enums.BookingAuditAction;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One append-only entry in a booking's history. Rows are never updated or
 * deleted — the trail is the record of what happened, as distinct from the
 * booking row, which only shows the current state.
 */
@Entity
@Table(name = "booking_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    /** Who acted. Nullable so the entry survives the actor being removed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingAuditAction action;

    /** Free-text context, e.g. a rejection reason or the new time on a reschedule. */
    @Column(length = 500)
    private String details;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
