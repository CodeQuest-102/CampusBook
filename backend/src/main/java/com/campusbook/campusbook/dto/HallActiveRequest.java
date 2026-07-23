package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Body of {@code PATCH /api/halls/{id}/active} — the maintenance toggle. */
@Data
public class HallActiveRequest {

    /**
     * Boxed so a missing field fails validation instead of silently arriving as
     * {@code false} and putting a room into maintenance nobody asked for.
     */
    @NotNull
    private Boolean active;

    public boolean isActive() {
        return Boolean.TRUE.equals(active);
    }
}
