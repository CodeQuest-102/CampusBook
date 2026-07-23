package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.service.BookingService;

import java.util.List;

/**
 * Per-id outcome of a bulk action. Deliberately not a single status: approving
 * several requests can succeed for some and fail for others (a slot taken in the
 * meantime), and the admin needs to see exactly which ones didn't go through.
 */
public record BulkActionResponse(
        int requested,
        List<Long> succeeded,
        List<Failure> failed
) {
    public record Failure(Long id, String reason) {}

    public static BulkActionResponse from(BookingService.BulkResult result) {
        List<Failure> failures = result.failed().stream()
                .map(f -> new Failure(f.id(), f.reason()))
                .toList();
        return new BulkActionResponse(
                result.succeeded().size() + failures.size(),
                result.succeeded(),
                failures);
    }
}
