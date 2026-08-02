package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.entity.Institution;

import java.time.LocalDateTime;

/** Platform-admin only: one row in the cross-institution monitoring list. */
public record InstitutionSummaryResponse(
        Long id,
        String name,
        String emailDomain,
        String tier,
        long hallCount,
        long bookingCount,
        long userCount,
        LocalDateTime createdAt
) {
    public static InstitutionSummaryResponse from(
            Institution institution, long hallCount, long bookingCount, long userCount) {
        return new InstitutionSummaryResponse(
                institution.getId(),
                institution.getName(),
                institution.getEmailDomain(),
                institution.getTier().name(),
                hallCount,
                bookingCount,
                userCount,
                institution.getCreatedAt()
        );
    }
}
