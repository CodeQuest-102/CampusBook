package com.campusbook.campusbook.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for a fresh self-registration. Deliberately carries no token —
 * unlike {@link AuthResponse}, which always carries a real, usable one — since
 * the account can't log in until its email is verified (see AuthController).
 */
@Data
@AllArgsConstructor
public class RegisterResponse {
    private String fullName;
    private String email;
    private String role;
}
