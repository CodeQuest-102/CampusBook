package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Confirms a Paystack transaction by its reference, so the server can verify it. */
@Data
public class VerifyRequest {

    @NotBlank
    private String reference;
}
