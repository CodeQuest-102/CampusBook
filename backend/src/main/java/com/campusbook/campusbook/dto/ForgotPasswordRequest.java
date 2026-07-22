package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Step 1 of password reset: ask for a code to be sent to this account's email. */
@Data
public class ForgotPasswordRequest {

    @NotBlank
    private String emailOrId;
}
