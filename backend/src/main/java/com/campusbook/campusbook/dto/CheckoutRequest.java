package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.SubscriptionTier;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Starts a Paystack checkout for a paid tier upgrade. */
@Data
public class CheckoutRequest {

    @NotNull
    private SubscriptionTier tier;
}
