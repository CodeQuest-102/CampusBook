package com.campusbook.campusbook.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class HallAvailabilityResponse {

    private Long hallId;
    private LocalDate date;
    private List<OccupiedSlot> occupiedSlots;

    @Data
    @AllArgsConstructor
    public static class OccupiedSlot {
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String bookedBy;
    }
}