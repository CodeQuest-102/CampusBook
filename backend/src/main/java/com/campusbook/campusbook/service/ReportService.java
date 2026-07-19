package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.ReportsResponse;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportService {

    /** Assumed bookable hours per hall per day, used for the utilization estimate. */
    private static final int BOOKABLE_HOURS_PER_DAY = 12;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private HallRepository hallRepository;

    public ReportsResponse buildSummary(String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart = switch (period == null ? "month" : period.toLowerCase()) {
            case "week" -> now.minusDays(7);
            case "year" -> now.minusDays(365);
            default -> now.minusDays(30);
        };
        long rangeDays = Math.max(1, ChronoUnit.DAYS.between(rangeStart.toLocalDate(), now.toLocalDate()) + 1);

        // Non-cancelled bookings that start within the selected period.
        List<Booking> bookings = bookingRepository.findByStartTimeBetween(rangeStart, now).stream()
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                .toList();

        ReportsResponse.Overview overview = buildOverview();

        ReportsResponse.LabelledCount mostBookedRoom = mostBookedRoom(bookings);
        ReportsResponse.LabelledCount peakDay = peakDay(bookings);
        int utilizationRate = utilizationRate(bookings, rangeDays);
        List<ReportsResponse.SeriesPoint> bookingsOverTime = bookingsByWeekday(bookings);

        return new ReportsResponse(overview, mostBookedRoom, peakDay, utilizationRate, bookingsOverTime);
    }

    /** Basic system counts — available to all admins regardless of plan. */
    public ReportsResponse.Overview buildOverview() {
        return new ReportsResponse.Overview(
                hallRepository.count(),
                bookingRepository.count(),
                bookingRepository.countByStatus(BookingStatus.PENDING)
        );
    }

    private ReportsResponse.LabelledCount mostBookedRoom(List<Booking> bookings) {
        return bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getHall().getId(), Collectors.toList()))
                .values().stream()
                .max((a, b) -> Integer.compare(a.size(), b.size()))
                .map(group -> {
                    var hall = group.get(0).getHall();
                    return new ReportsResponse.LabelledCount(
                            hall.getBlock() + " (" + hall.getRoomCode() + ")", group.size());
                })
                .orElse(new ReportsResponse.LabelledCount("—", 0));
    }

    private ReportsResponse.LabelledCount peakDay(List<Booking> bookings) {
        Map<DayOfWeek, Long> byDay = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getStartTime().getDayOfWeek(), Collectors.counting()));

        return byDay.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> new ReportsResponse.LabelledCount(
                        e.getKey().getDisplayName(TextStyle.FULL, Locale.ENGLISH), e.getValue()))
                .orElse(new ReportsResponse.LabelledCount("—", 0));
    }

    /**
     * Rough estimate: total approved booked hours over the period as a share of the
     * theoretical capacity (active halls × bookable hours × days). Capped at 100.
     */
    private int utilizationRate(List<Booking> bookings, long rangeDays) {
        long activeHalls = hallRepository.findByActiveTrue().size();
        if (activeHalls == 0) return 0;

        double bookedHours = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .mapToDouble(b -> Duration.between(b.getStartTime(), b.getEndTime()).toMinutes() / 60.0)
                .sum();

        double capacityHours = activeHalls * BOOKABLE_HOURS_PER_DAY * (double) rangeDays;
        if (capacityHours == 0) return 0;

        return (int) Math.min(100, Math.round(bookedHours / capacityHours * 100));
    }

    private List<ReportsResponse.SeriesPoint> bookingsByWeekday(List<Booking> bookings) {
        Map<DayOfWeek, Long> byDay = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getStartTime().getDayOfWeek(), Collectors.counting()));

        // Mon → Sun, always present so the chart has a stable shape.
        return List.of(
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY
        ).stream()
                .map(d -> new ReportsResponse.SeriesPoint(
                        d.getDisplayName(TextStyle.SHORT, Locale.ENGLISH), byDay.getOrDefault(d, 0L)))
                .toList();
    }
}
