package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.UpdateProfileRequest;
import com.campusbook.campusbook.dto.UserResponse;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * Directory of all users, admin-only. Optional {@code ?role=} filter accepts
     * the backend role names (ADMIN, LECTURER, STUDENT_LEADER).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> listUsers(@RequestParam(value = "role", required = false) Role role) {
        List<UserResponse> users = userService.getAllUsers().stream()
                .filter(u -> role == null || u.getRole() == role)
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    /** The signed-in user's own profile. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /** Update the signed-in user's own name / department. */
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@AuthenticationPrincipal User user,
                                                 @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(UserResponse.from(userService.updateProfile(user.getId(), request)));
    }
}
