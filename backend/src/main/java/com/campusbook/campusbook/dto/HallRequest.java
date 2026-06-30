package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class HallRequest {

    @NotBlank
    private String block;

    @NotBlank
    private String roomCode;

    @Positive
    private Integer capacity;

    private boolean hasProjector;
    private boolean hasAC;
    private boolean hasMicrophone;
    private boolean active = true;
}
