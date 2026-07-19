package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.AuthResponse;
import com.campusbook.campusbook.dto.LoginRequest;
import com.campusbook.campusbook.dto.RegisterRequest;
import com.campusbook.campusbook.dto.ResetPasswordRequest;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.security.JwtUtil;
import com.campusbook.campusbook.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setStaffOrStudentId(request.getStaffOrStudentId());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());
        user.setDepartment(request.getDepartment());

        User saved = userService.registerUser(user);
        String token = jwtUtil.generateToken(saved.getEmail());

        return ResponseEntity.ok(new AuthResponse(
                token, saved.getFullName(), saved.getEmail(), saved.getRole().name()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = userService.findByEmailOrStaffId(request.getEmailOrId());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return ResponseEntity.ok(new AuthResponse(
                token, user.getFullName(), user.getEmail(), user.getRole().name()
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(request.getEmailOrId(), request.getStaffOrStudentId(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}