package com.campusbook.campusbook.dto;

import java.util.List;

/**
 * Aggregated analytics for the admin Reports screen and dashboard overview.
 * {@code overview} is global (all-time); the remaining figures are scoped to the
 * requested period (week / month / year).
 */
public record ReportsResponse(
        Overview overview,
        LabelledCount mostBookedRoom,
        LabelledCount peakDay,
        int utilizationRate,
        List<SeriesPoint> bookingsOverTime
) {
    public record Overview(long totalRooms, long totalBookings, long pendingRequests) {}

    public record LabelledCount(String name, long count) {}

    public record SeriesPoint(String label, long value) {}
}
