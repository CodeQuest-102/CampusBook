package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Submit the emailed code to finish verifying a self-registered account. */
@Data
public class VerifyEmailRequest {

    @NotBlank
    private String emailOrId;

    @NotBlank
    private String otp;
}
