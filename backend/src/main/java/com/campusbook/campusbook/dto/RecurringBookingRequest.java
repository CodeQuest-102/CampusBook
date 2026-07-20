package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Create a weekly-repeating series of bookings. The first occurrence is
 * {@code startTime}–{@code endTime}; subsequent occurrences repeat every 7 days
 * at the same time until (and including) {@code until}.
 */
@Data
public class RecurringBookingRequest {

    @NotNull
    private Long hallId;

    @NotBlank
    private String purpose;

    private String notes;

    private Integer attendance;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;

    @NotNull
    private LocalDate until;
}
