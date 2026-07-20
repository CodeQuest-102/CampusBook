package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.entity.Booking;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class BookingResponse {

    private Long id;
    private Long hallId;
    private String roomCode;
    private String block;
    private Long userId;
    private String userFullName;
    private String userRole;
    private String userDepartment;
    private String purpose;
    private String notes;
    private Integer attendance;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private String approvedBy;
    private String rejectionReason;
    private LocalDateTime createdAt;

    public static BookingResponse from(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getHall().getId(),
                booking.getHall().getRoomCode(),
                booking.getHall().getBlock(),
                booking.getUser().getId(),
                booking.getUser().getFullName(),
                booking.getUser().getRole() == null ? null : booking.getUser().getRole().name(),
                booking.getUser().getDepartment(),
                booking.getPurpose(),
                booking.getNotes(),
                booking.getAttendance(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus().name(),
                booking.getApprovedBy() == null ? null : booking.getApprovedBy().getFullName(),
                booking.getRejectionReason(),
                booking.getCreatedAt()
        );
    }
}
