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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
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

    private LocalDateTime rangeStartFor(String period) {
        LocalDateTime now = LocalDateTime.now();
        return switch (period == null ? "month" : period.toLowerCase()) {
            case "week" -> now.minusDays(7);
            case "year" -> now.minusDays(365);
            default -> now.minusDays(30);
        };
    }

    public ReportsResponse buildSummary(Long institutionId, String period) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart = rangeStartFor(period);
        long rangeDays = Math.max(1, ChronoUnit.DAYS.between(rangeStart.toLocalDate(), now.toLocalDate()) + 1);

        // Every metric on the dashboard reflects confirmed room usage, so they all
        // draw from the same set: approved bookings that start within the period.
        List<Booking> bookings = approvedBookingsInPeriod(institutionId, rangeStart, now);

        ReportsResponse.LabelledCount mostBookedRoom = mostBookedRoom(bookings);
        ReportsResponse.LabelledCount peakDay = peakDay(bookings);
        int utilizationRate = utilizationRate(institutionId, bookings, rangeDays);
        List<ReportsResponse.SeriesPoint> bookingsOverTime =
                bookingsOverTime(period, bookings, rangeStart, now);

        return new ReportsResponse(mostBookedRoom, peakDay, utilizationRate, bookingsOverTime);
    }

    /** Approved bookings at this institution that start within the period — the basis for all reporting. */
    private List<Booking> approvedBookingsInPeriod(Long institutionId, LocalDateTime rangeStart, LocalDateTime now) {
        return bookingRepository
                .findByHallInstitutionIdAndStartTimeBetween(institutionId, rangeStart, now).stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .toList();
    }

    /** Basic system counts for one institution — available to all admins regardless of plan. */
    public ReportsResponse.Overview buildOverview(Long institutionId) {
        return new ReportsResponse.Overview(
                hallRepository.countByInstitutionId(institutionId),
                bookingRepository.countByHallInstitutionId(institutionId),
                bookingRepository.countByHallInstitutionIdAndStatus(institutionId, BookingStatus.PENDING)
        );
    }

    /**
     * Approved bookings in the selected period as a CSV document (Campus Pro feature).
     * Matches the on-screen summary, which is also approved-only.
     */
    public String exportBookingsCsv(Long institutionId, String period) {
        List<Booking> bookings = approvedBookingsInPeriod(institutionId, rangeStartFor(period), LocalDateTime.now())
                .stream()
                .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("ID,Room,Booked By,Role,Purpose,Attendance,Status,Start,End,Created\n");
        for (Booking b : bookings) {
            String room = b.getHall().getBlock() + " " + b.getHall().getRoomCode();
            String role = b.getUser().getRole() == null ? "" : b.getUser().getRole().name();
            sb.append(csv(b.getId()))
              .append(',').append(csv(room))
              .append(',').append(csv(b.getUser().getFullName()))
              .append(',').append(csv(role))
              .append(',').append(csv(b.getPurpose()))
              .append(',').append(csv(b.getAttendance()))
              .append(',').append(csv(b.getStatus().name()))
              .append(',').append(csv(b.getStartTime()))
              .append(',').append(csv(b.getEndTime()))
              .append(',').append(csv(b.getCreatedAt()))
              .append('\n');
        }
        return sb.toString();
    }

    /** CSV-escape a value: wrap in quotes and double any embedded quotes. */
    private String csv(Object value) {
        if (value == null) return "";
        String s = value.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
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
     * Rough estimate: total booked hours over the period as a share of the
     * theoretical capacity (active halls × bookable hours × days). Capped at 100.
     * The caller passes approved bookings only, so every hour here is confirmed usage.
     */
    private int utilizationRate(Long institutionId, List<Booking> bookings, long rangeDays) {
        long activeHalls = hallRepository.countByInstitutionIdAndActiveTrue(institutionId);
        if (activeHalls == 0) return 0;

        double bookedHours = bookings.stream()
                .mapToDouble(b -> Duration.between(b.getStartTime(), b.getEndTime()).toMinutes() / 60.0)
                .sum();

        double capacityHours = activeHalls * BOOKABLE_HOURS_PER_DAY * (double) rangeDays;
        if (capacityHours == 0) return 0;

        return (int) Math.min(100, Math.round(bookedHours / capacityHours * 100));
    }

    /** Shapes the trend chart to match the selected period: daily for a week, weekly for a month, monthly for a year. */
    private List<ReportsResponse.SeriesPoint> bookingsOverTime(
            String period, List<Booking> bookings, LocalDateTime rangeStart, LocalDateTime now) {
        return switch (period == null ? "month" : period.toLowerCase()) {
            case "week" -> bookingsByDay(bookings, now.toLocalDate().minusDays(6), now.toLocalDate());
            case "year" -> bookingsByMonth(bookings, YearMonth.from(now).minusMonths(11), YearMonth.from(now));
            default -> bookingsByWeek(bookings, rangeStart.toLocalDate(), now.toLocalDate());
        };
    }

    private List<ReportsResponse.SeriesPoint> bookingsByDay(List<Booking> bookings, LocalDate start, LocalDate end) {
        Map<LocalDate, Long> byDate = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getStartTime().toLocalDate(), Collectors.counting()));

        List<ReportsResponse.SeriesPoint> points = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            points.add(new ReportsResponse.SeriesPoint(
                    d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH), byDate.getOrDefault(d, 0L)));
        }
        return points;
    }

    private List<ReportsResponse.SeriesPoint> bookingsByWeek(List<Booking> bookings, LocalDate start, LocalDate end) {
        long totalDays = ChronoUnit.DAYS.between(start, end) + 1;
        int weekCount = (int) Math.max(1, Math.ceil(totalDays / 7.0));
        long[] counts = new long[weekCount];

        for (Booking b : bookings) {
            long dayOffset = ChronoUnit.DAYS.between(start, b.getStartTime().toLocalDate());
            int idx = (int) Math.min(weekCount - 1, Math.max(0, dayOffset / 7));
            counts[idx]++;
        }

        List<ReportsResponse.SeriesPoint> points = new ArrayList<>();
        for (int i = 0; i < weekCount; i++) {
            points.add(new ReportsResponse.SeriesPoint("Week " + (i + 1), counts[i]));
        }
        return points;
    }

    private List<ReportsResponse.SeriesPoint> bookingsByMonth(List<Booking> bookings, YearMonth start, YearMonth end) {
        Map<YearMonth, Long> byMonth = bookings.stream()
                .collect(Collectors.groupingBy(b -> YearMonth.from(b.getStartTime()), Collectors.counting()));

        List<ReportsResponse.SeriesPoint> points = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(end); m = m.plusMonths(1)) {
            points.add(new ReportsResponse.SeriesPoint(
                    m.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH), byMonth.getOrDefault(m, 0L)));
        }
        return points;
    }
}
