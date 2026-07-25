package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.entity.BookingAudit;

import java.time.LocalDateTime;

public record BookingAuditResponse(
        Long id,
        String action,
        String actorName,
        String details,
        LocalDateTime createdAt
) {
    public static BookingAuditResponse from(BookingAudit audit) {
        return new BookingAuditResponse(
                audit.getId(),
                audit.getAction().name(),
                audit.getActor() == null ? null : audit.getActor().getFullName(),
                audit.getDetails(),
                audit.getCreatedAt()
        );
    }
}
