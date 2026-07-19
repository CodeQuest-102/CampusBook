package com.campusbook.campusbook.config;

import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedDemoData(HallRepository hallRepository,
                                    UserRepository userRepository,
                                    InstitutionRepository institutionRepository,
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
        };
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