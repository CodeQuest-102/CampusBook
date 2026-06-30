package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank
    private String emailOrID; // accept either email or staff id/student id for login

    @NotBlank
    private String password;
}