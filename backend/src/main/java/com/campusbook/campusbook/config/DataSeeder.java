package com.campusbook.campusbook.config;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.BookingStatus;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedDemoData(HallRepository hallRepository,
                                    UserRepository userRepository,
                                    InstitutionRepository institutionRepository,
                                    BookingRepository bookingRepository,
                                    PasswordEncoder passwordEncoder) {
        return args -> {

            Institution knust = institutionRepository.findAll().stream()
                    .filter(i -> i.getName().equals("KNUST"))
                    .findFirst()
                    .orElseGet(() -> {
                        Institution institution = new Institution();
                        institution.setName("KNUST");
                        institution.setTier(SubscriptionTier.FREE);
                        return institutionRepository.save(institution);
                    });

            if (hallRepository.count() == 0) {
                hallRepository.saveAll(java.util.List.of(
                        buildHall("Science Complex Block", "GF1", 120, true, true, true, knust),
                        buildHall("Science Complex Block", "GF2", 90, true, false, true, knust),
                        buildHall("College of Engineering", "SF1", 180, true, true, true, knust),
                        buildHall("College of Humanities", "LH3", 75, true, false, false, knust),
                        buildHall("Business School", "BS-Auditorium", 250, true, true, true, knust)
                ));
            }

            if (!userRepository.existsByEmail("admin@campusbook.local")) {
                User admin = new User();
                admin.setFullName("CampusBook Admin");
                admin.setEmail("admin@campusbook.local");
                admin.setStaffOrStudentId("ADMIN001");
                admin.setPassword(passwordEncoder.encode("admin12345"));
                admin.setRole(Role.ADMIN);
                admin.setDepartment("Facilities");
                admin.setInstitution(knust);
                userRepository.save(admin);
            }

            if (!userRepository.existsByEmail("lecturer@campusbook.local")
                    && !userRepository.existsByStaffOrStudentId("STF-DEMO-01")) {
                User lecturer = new User();
                lecturer.setFullName("Dr. Kwaku Mensah");
                lecturer.setEmail("lecturer@campusbook.local");
                lecturer.setStaffOrStudentId("STF-DEMO-01");
                lecturer.setPassword(passwordEncoder.encode("lecturer12345"));
                lecturer.setRole(Role.LECTURER);
                lecturer.setDepartment("Computer Science");
                lecturer.setInstitution(knust);
                userRepository.save(lecturer);
            }

            if (!userRepository.existsByEmail("student@campusbook.local")
                    && !userRepository.existsByStaffOrStudentId("STU-DEMO-01")) {
                User student = new User();
                student.setFullName("Abubakar Sadiq");
                student.setEmail("student@campusbook.local");
                student.setStaffOrStudentId("STU-DEMO-01");
                student.setPassword(passwordEncoder.encode("student12345"));
                student.setRole(Role.STUDENT_LEADER);
                student.setDepartment("Computer Science");
                student.setInstitution(knust);
                userRepository.save(student);
            }

            // Demo bookings — only on an empty bookings table, so this never
            // stacks up on restart or disturbs a database that already has data.
            if (bookingRepository.count() == 0) {
                User admin = userRepository.findByEmail("admin@campusbook.local").orElse(null);
                User student = userRepository.findByEmail("student@campusbook.local").orElse(null);
                User lecturer = userRepository.findByEmail("lecturer@campusbook.local").orElse(null);
                var halls = hallRepository.findAll();

                if (admin != null && student != null && lecturer != null && halls.size() >= 5) {
                    Hall gf1 = halls.get(0), gf2 = halls.get(1), sf1 = halls.get(2),
                            lh3 = halls.get(3), audi = halls.get(4);
                    LocalDateTime now = LocalDateTime.now();

                    java.util.List<Booking> bookings = new java.util.ArrayList<>();
                    // Past, APPROVED — populate Reports (most-booked, peak day, utilization).
                    bookings.add(approved(student, gf1, "CSM 297 Lecture", 80, at(now, -14, 10), at(now, -14, 12), admin));
                    bookings.add(approved(lecturer, sf1, "Engineering Seminar", 120, at(now, -12, 14), at(now, -12, 16), admin));
                    bookings.add(approved(student, gf1, "Robotics Club Meeting", 40, at(now, -10, 16), at(now, -10, 18), admin));
                    bookings.add(approved(lecturer, lh3, "Humanities Guest Lecture", 60, at(now, -7, 9), at(now, -7, 11), admin));
                    bookings.add(approved(student, audi, "Business Workshop", 150, at(now, -5, 13), at(now, -5, 15), admin));
                    bookings.add(approved(lecturer, gf2, "Department Meeting", 30, at(now, -3, 11), at(now, -3, 13), admin));
                    // Future, PENDING — populate the admin Pending Requests screen.
                    bookings.add(pending(student, gf1, "Study Group", 25, at(now, 2, 10), at(now, 2, 12)));
                    bookings.add(pending(lecturer, sf1, "Thesis Defense", 50, at(now, 3, 15), at(now, 3, 17)));
                    bookings.add(pending(student, lh3, "Debate Practice", 35, at(now, 5, 14), at(now, 5, 16)));
                    // Future, APPROVED — populate the Calendar with upcoming events.
                    bookings.add(approved(lecturer, gf2, "Office Hours", 15, at(now, 1, 13), at(now, 1, 14), admin));
                    bookings.add(approved(student, audi, "Faculty Assembly", 200, at(now, 4, 9), at(now, 4, 11), admin));
                    // One REJECTED for status variety.
                    Booking rejected = pending(student, sf1, "After-hours Event", 100, at(now, -6, 18), at(now, -6, 20));
                    rejected.setStatus(BookingStatus.REJECTED);
                    rejected.setApprovedBy(admin);
                    rejected.setRejectionReason("Outside permitted booking hours.");
                    bookings.add(rejected);

                    bookingRepository.saveAll(bookings);
                }
            }
        };
    }

    /** A day-offset from now at a fixed hour, trimmed to the top of the hour. */
    private LocalDateTime at(LocalDateTime now, int dayOffset, int hour) {
        return now.plusDays(dayOffset).withHour(hour).withMinute(0).withSecond(0).withNano(0);
    }

    private Booking approved(User user, Hall hall, String purpose, int attendance,
                              LocalDateTime start, LocalDateTime end, User admin) {
        Booking b = pending(user, hall, purpose, attendance, start, end);
        b.setStatus(BookingStatus.APPROVED);
        b.setApprovedBy(admin);
        return b;
    }

    private Booking pending(User user, Hall hall, String purpose, int attendance,
                             LocalDateTime start, LocalDateTime end) {
        Booking b = new Booking();
        b.setUser(user);
        b.setHall(hall);
        b.setPurpose(purpose);
        b.setAttendance(attendance);
        b.setStartTime(start);
        b.setEndTime(end);
        b.setStatus(BookingStatus.PENDING);
        return b;
    }

    private Hall buildHall(String block, String roomCode, int capacity,
                            boolean hasProjector, boolean hasAC, boolean hasMicrophone,
                            Institution institution) {
        Hall hall = new Hall();
        hall.setBlock(block);
        hall.setRoomCode(roomCode);
        hall.setCapacity(capacity);
        hall.setHasProjector(hasProjector);
        hall.setHasAC(hasAC);
        hall.setHasMicrophone(hasMicrophone);
        hall.setActive(true);
        hall.setInstitution(institution);
        return hall;
    }
}