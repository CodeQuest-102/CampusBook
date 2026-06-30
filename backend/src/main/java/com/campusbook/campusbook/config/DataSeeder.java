package com.campusbook.campusbook.config;

import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedDemoData(HallRepository hallRepository,
                                   UserRepository userRepository,
                                   PasswordEncoder passwordEncoder) {
        return args -> {
            if (hallRepository.count() == 0) {
                hallRepository.saveAll(List.of(
                        new Hall(null, "Science Complex Block", "GF1", 120, true, true, true, true),
                        new Hall(null, "Science Complex Block", "GF2", 90, true, false, true, true),
                        new Hall(null, "College of Engineering", "SF1", 180, true, true, true, true),
                        new Hall(null, "College of Humanities", "LH3", 75, true, false, false, true),
                        new Hall(null, "Business School", "BS-Auditorium", 250, true, true, true, true)
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
                userRepository.save(admin);
            }
        };
    }
}
