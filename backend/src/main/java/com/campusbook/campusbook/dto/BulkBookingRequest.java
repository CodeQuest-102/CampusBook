package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** Ids to act on in bulk, plus an optional shared reason (used when rejecting). */
@Data
public class BulkBookingRequest {

    @NotEmpty(message = "Select at least one request")
    @Size(max = 100, message = "You can act on at most 100 requests at once")
    private List<Long> ids;

    @Size(max = 255, message = "Reason must be 255 characters or fewer")
    private String reason;
}
