package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Renders bookings as iCalendar (RFC 5545) documents so they can be imported
 * into Apple/Google/Outlook Calendar.
 *
 * <p>Written by hand rather than pulling in a library: the subset needed here is
 * small, but it is <em>not</em> "just string concatenation" — the format has real
 * rules that break silently in calendar clients when ignored. Specifically this
 * escapes the reserved characters in text values, folds long lines, and emits a
 * stable UID per booking so re-importing updates the existing event instead of
 * creating a duplicate.
 */
@Service
public class CalendarService {

    /** Local date-time form (no trailing Z): the campus has one timezone. */
    private static final DateTimeFormatter ICS_LOCAL =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");

    /** RFC 5545 caps content lines at 75 octets, continued by a leading space. */
    private static final int MAX_LINE_OCTETS = 75;

    /** One booking as a complete calendar document. */
    public String toIcs(Booking booking) {
        return document(List.of(booking));
    }

    /** Several bookings as a single calendar document. */
    public String toIcs(List<Booking> bookings) {
        return document(bookings);
    }

    private String document(List<Booking> bookings) {
        StringBuilder sb = new StringBuilder();
        line(sb, "BEGIN:VCALENDAR");
        line(sb, "VERSION:2.0");
        line(sb, "PRODID:-//CampusBook//Room Booking//EN");
        line(sb, "CALSCALE:GREGORIAN");
        line(sb, "METHOD:PUBLISH");

        String stamp = ICS_LOCAL.format(LocalDateTime.now());
        for (Booking b : bookings) {
            line(sb, "BEGIN:VEVENT");
            // Stable per booking, so a re-import updates rather than duplicates.
            line(sb, "UID:booking-" + b.getId() + "@campusbook");
            line(sb, "DTSTAMP:" + stamp);
            line(sb, "DTSTART:" + ICS_LOCAL.format(b.getStartTime()));
            line(sb, "DTEND:" + ICS_LOCAL.format(b.getEndTime()));
            line(sb, "SUMMARY:" + escape(summary(b)));
            line(sb, "LOCATION:" + escape(location(b)));
            line(sb, "DESCRIPTION:" + escape(description(b)));
            line(sb, "STATUS:" + (b.getStatus() == null ? "CONFIRMED" : icsStatus(b)));
            line(sb, "END:VEVENT");
        }

        line(sb, "END:VCALENDAR");
        return sb.toString();
    }

    private String summary(Booking b) {
        String purpose = b.getPurpose() == null ? "Room booking" : b.getPurpose();
        return purpose + " — " + location(b);
    }

    private String location(Booking b) {
        if (b.getHall() == null) return "CampusBook";
        return b.getHall().getBlock() + " " + b.getHall().getRoomCode();
    }

    private String description(Booking b) {
        StringBuilder d = new StringBuilder();
        if (b.getUser() != null) d.append("Booked by: ").append(b.getUser().getFullName()).append("\n");
        if (b.getStatus() != null) d.append("Status: ").append(b.getStatus().name()).append("\n");
        if (b.getAttendance() != null) d.append("Expected attendance: ").append(b.getAttendance()).append("\n");
        if (b.getNotes() != null && !b.getNotes().isBlank()) d.append("Notes: ").append(b.getNotes());
        return d.toString().trim();
    }

    private String icsStatus(Booking b) {
        return switch (b.getStatus()) {
            case APPROVED -> "CONFIRMED";
            case PENDING -> "TENTATIVE";
            case REJECTED, CANCELLED -> "CANCELLED";
        };
    }

    /**
     * Escape the characters RFC 5545 reserves in TEXT values. Order matters:
     * backslash first, or the escapes we add would themselves be escaped.
     */
    private String escape(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n")
                .replace("\r", "\\n");
    }

    /** Append one content line, folded to the octet limit, with CRLF endings. */
    private void line(StringBuilder sb, String content) {
        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (bytes.length <= MAX_LINE_OCTETS) {
            sb.append(content).append("\r\n");
            return;
        }

        // Fold on octet boundaries without splitting a multi-byte character:
        // walk code points and start a new (space-prefixed) line before overflow.
        int consumed = 0;
        StringBuilder current = new StringBuilder();
        boolean first = true;
        for (int i = 0; i < content.length(); ) {
            int cp = content.codePointAt(i);
            int charCount = Character.charCount(cp);
            String piece = content.substring(i, i + charCount);
            int pieceOctets = piece.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;

            // Continuation lines spend one octet on the leading space.
            int limit = first ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
            if (consumed + pieceOctets > limit) {
                sb.append(first ? "" : " ").append(current).append("\r\n");
                current.setLength(0);
                consumed = 0;
                first = false;
            }
            current.append(piece);
            consumed += pieceOctets;
            i += charCount;
        }
        if (current.length() > 0) {
            sb.append(first ? "" : " ").append(current).append("\r\n");
        }
    }
}
