package com.campusbook.campusbook.dto;

import java.time.LocalDate;
import java.util.List;

/** Result of a recurring-booking request: what was created vs. skipped and why. */
public record RecurringBookingResponse(
        int requested,
        List<BookingResponse> created,
        List<SkippedOccurrence> skipped
) {
    public record SkippedOccurrence(LocalDate date, String reason) {}
}
