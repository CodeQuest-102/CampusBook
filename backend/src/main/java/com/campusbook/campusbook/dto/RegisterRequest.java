package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String staffOrStudentId;

    @NotBlank
    private String password;

    private Role role;

    private String department;
}

