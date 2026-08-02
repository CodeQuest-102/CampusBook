package com.campusbook.campusbook.enums;

public enum Role {
    /** Institution-scoped administrator — never sees another institution's data. */
    ADMIN,
    LECTURER,
    STUDENT_LEADER,
    /**
     * Sits above institutions: creates new institutions and their first admin
     * account, and views a read-only cross-institution summary. Deliberately
     * does not carry ADMIN's institution-scoped powers (room/booking/report
     * management) — a platform admin has no business in any one school's
     * day-to-day operations.
     */
    PLATFORM_ADMIN
}