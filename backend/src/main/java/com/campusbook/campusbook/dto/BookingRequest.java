package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingRequest {

    @NotNull
    private Long hallId;

    @NotBlank
    @Size(max = 200, message = "Purpose must be 200 characters or fewer")
    private String purpose;

    @Size(max = 1000, message = "Notes must be 1000 characters or fewer")
    private String notes;

    @Positive(message = "Expected attendance must be above zero")
    private Integer attendance;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;
}
