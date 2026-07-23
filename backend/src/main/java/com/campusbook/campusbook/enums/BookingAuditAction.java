package com.campusbook.campusbook.enums;

/** What happened to a booking. Recorded on the audit trail, never updated. */
public enum BookingAuditAction {
    CREATED,
    APPROVED,
    REJECTED,
    CANCELLED,
    RESCHEDULED
}
