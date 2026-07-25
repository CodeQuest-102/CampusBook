package com.campusbook.campusbook.dto;

import java.util.List;

/**
 * Aggregated analytics for the admin Reports screen. All figures are scoped to the
 * requested period (week / month / year) and count approved bookings only.
 *
 * <p>The nested {@link Overview} (global, all-time counts) is served separately by
 * the plan-independent {@code /api/reports/overview} endpoint for the dashboard.
 */
public record ReportsResponse(
        LabelledCount mostBookedRoom,
        LabelledCount peakDay,
        int utilizationRate,
        List<SeriesPoint> bookingsOverTime
) {
    public record Overview(long totalRooms, long totalBookings, long pendingRequests) {}

    public record LabelledCount(String name, long count) {}

    public record SeriesPoint(String label, long value) {}
}
