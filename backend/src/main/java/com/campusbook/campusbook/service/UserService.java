package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User registerUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userRepository.existsByStaffOrStudentId(user.getStaffOrStudentId())) {
            throw new IllegalArgumentException("Staff/Student ID already registered");
        }

        // Hash the password before saving — never store plain text
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    public User findByEmailOrStaffId(String emailOrId) {
        return userRepository.findByEmail(emailOrId)
                .or(() -> userRepository.findByStaffOrStudentId(emailOrId))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}