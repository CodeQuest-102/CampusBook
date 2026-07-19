package com.campusbook.campusbook.entity;

import com.campusbook.campusbook.enums.BookingStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;             // who booked it (lecturer or student leader)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hall_id", nullable = false)
    private Hall hall;             // which hall

    @NotBlank
    private String purpose;        // e.g. "CSM 297 lecture", "Robotics Club meeting"

    @Column(length = 1000)
    private String notes;          // optional free-text notes from the requester

    private Integer attendance;    // optional expected number of attendees

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private BookingStatus status = BookingStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;       // which admin approved/rejected it, nullable until acted on

    private String rejectionReason; // optional, filled in if status = REJECTED

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
