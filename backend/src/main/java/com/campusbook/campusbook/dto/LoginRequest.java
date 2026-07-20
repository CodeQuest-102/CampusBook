package com.campusbook.campusbook.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank
    @JsonAlias("emailOrID")
    private String emailOrId; // accept either email or staff id/student id for login

    @NotBlank
    private String password;
}
