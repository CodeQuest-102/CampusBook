package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Ask for a fresh verification code to be emailed to this account. */
@Data
public class ResendVerificationRequest {

    @NotBlank
    private String emailOrId;
}
