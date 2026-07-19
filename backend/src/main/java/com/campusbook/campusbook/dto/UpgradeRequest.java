package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.SubscriptionTier;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpgradeRequest {

    @NotNull
    private SubscriptionTier tier;
}
