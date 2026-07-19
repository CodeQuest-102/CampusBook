package com.campusbook.campusbook.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class HallAvailabilityResponse {

    private Long hallId;
    private LocalDate date;
    private List<OccupiedSlot> occupiedSlots;

    public HallAvailabilityResponse() {
    }

    public HallAvailabilityResponse(Long hallId, LocalDate date, List<OccupiedSlot> occupiedSlots) {
        this.hallId = hallId;
        this.date = date;
        this.occupiedSlots = occupiedSlots;
    }

    public Long getHallId() {
        return hallId;
    }

    public void setHallId(Long hallId) {
        this.hallId = hallId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public List<OccupiedSlot> getOccupiedSlots() {
        return occupiedSlots;
    }

    public void setOccupiedSlots(List<OccupiedSlot> occupiedSlots) {
        this.occupiedSlots = occupiedSlots;
    }

    public record OccupiedSlot(LocalDateTime startTime, LocalDateTime endTime, String bookedBy) {
    }
}