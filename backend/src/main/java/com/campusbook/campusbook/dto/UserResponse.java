package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String fullName;
    private String email;
    private String staffOrStudentId;
    private String role;
    private String department;

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getStaffOrStudentId(),
                user.getRole() == null ? null : user.getRole().name(),
                user.getDepartment()
        );
    }
}
