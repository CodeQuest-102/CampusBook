package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarServiceTest {

    private final CalendarService service = new CalendarService();

    /**
     * Reverse RFC 5545 line folding, the way a real parser does before reading
     * values. Without this, assertions on a property's content are at the mercy
     * of wherever the 75-octet boundary happened to fall.
     */
    private static String unfold(String ics) {
        return ics.replace("\r\n ", "");
    }

    private Booking booking(String purpose, BookingStatus status) {
        Hall hall = new Hall();
        hall.setBlock("Science Complex Block");
        hall.setRoomCode("GF1");

        User user = new User();
        user.setFullName("Abubakar Sadiq");

        Booking b = new Booking();
        b.setId(42L);
        b.setHall(hall);
        b.setUser(user);
        b.setPurpose(purpose);
        b.setStartTime(LocalDateTime.of(2027, 3, 4, 10, 0));
        b.setEndTime(LocalDateTime.of(2027, 3, 4, 12, 0));
        b.setStatus(status);
        return b;
    }

    @Test
    void producesAWellFormedCalendarDocument() {
        String ics = service.toIcs(booking("CSM 297 lecture", BookingStatus.APPROVED));

        assertThat(ics).startsWith("BEGIN:VCALENDAR\r\n");
        assertThat(ics).endsWith("END:VCALENDAR\r\n");
        assertThat(ics).contains("VERSION:2.0");
        assertThat(ics).contains("BEGIN:VEVENT");
        assertThat(ics).contains("END:VEVENT");
        assertThat(ics).contains("DTSTART:20270304T100000");
        assertThat(ics).contains("DTEND:20270304T120000");
        assertThat(ics).contains("DTSTAMP:");
    }

    @Test
    void usesAStableUidSoReimportUpdatesRatherThanDuplicates() {
        String first = service.toIcs(booking("Lecture", BookingStatus.APPROVED));
        String second = service.toIcs(booking("Lecture", BookingStatus.APPROVED));

        assertThat(first).contains("UID:booking-42@campusbook");
        assertThat(second).contains("UID:booking-42@campusbook");
    }

    @Test
    void escapesReservedCharactersInTextValues() {
        // Commas, semicolons and backslashes are structural in RFC 5545 TEXT values.
        String ics = service.toIcs(booking("Robotics, AI; and ML\\Deep", BookingStatus.APPROVED));

        assertThat(unfold(ics)).contains("Robotics\\, AI\\; and ML\\\\Deep");
    }

    @Test
    void escapesNewlinesRatherThanBreakingTheLineStructure() {
        Booking b = booking("Lecture", BookingStatus.APPROVED);
        b.setNotes("First line\nSecond line");

        String ics = service.toIcs(b);

        // A raw newline would terminate the property and corrupt the document;
        // it must survive as the two-character escape "\n" instead.
        assertThat(unfold(ics)).contains("Notes: First line\\nSecond line");
        assertThat(ics).doesNotContain("Notes: First line\nSecond");
    }

    @Test
    void foldsLinesLongerThanSeventyFiveOctets() {
        String longPurpose = "A".repeat(200);
        String ics = service.toIcs(booking(longPurpose, BookingStatus.APPROVED));

        for (String line : ics.split("\r\n")) {
            assertThat(line.getBytes(java.nio.charset.StandardCharsets.UTF_8).length)
                    .as("content line within the 75-octet limit: %s", line)
                    .isLessThanOrEqualTo(75);
        }
        // Folded continuations are marked by a leading space.
        assertThat(ics).contains("\r\n A");
    }

    @Test
    void mapsBookingStatusToCalendarStatus() {
        assertThat(service.toIcs(booking("x", BookingStatus.APPROVED))).contains("STATUS:CONFIRMED");
        assertThat(service.toIcs(booking("x", BookingStatus.PENDING))).contains("STATUS:TENTATIVE");
        assertThat(service.toIcs(booking("x", BookingStatus.CANCELLED))).contains("STATUS:CANCELLED");
    }

    @Test
    void manyBookingsBecomeOneDocumentWithOneEventEach() {
        Booking a = booking("First", BookingStatus.APPROVED);
        Booking b = booking("Second", BookingStatus.APPROVED);
        b.setId(43L);

        String ics = service.toIcs(List.of(a, b));

        assertThat(ics.split("BEGIN:VEVENT", -1)).hasSize(3); // 2 events -> 3 fragments
        assertThat(ics).contains("UID:booking-42@campusbook");
        assertThat(ics).contains("UID:booking-43@campusbook");
        assertThat(ics.split("BEGIN:VCALENDAR", -1)).hasSize(2); // exactly one calendar
    }
}
