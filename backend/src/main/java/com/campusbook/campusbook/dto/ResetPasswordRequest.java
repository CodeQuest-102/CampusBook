package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Step 2 of password reset: submit the emailed code and the new password. */
@Data
public class ResetPasswordRequest {

    @NotBlank
    private String emailOrId;

    @NotBlank
    private String otp;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String newPassword;
}
