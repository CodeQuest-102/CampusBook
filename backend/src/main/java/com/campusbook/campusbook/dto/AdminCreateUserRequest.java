package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * An account created by an administrator for someone at their own institution.
 *
 * <p>The field rules match {@link RegisterRequest} — same KNUST address, same
 * campus-ID lengths, same password floor — with one deliberate difference: an
 * admin <em>may</em> create another ADMIN. That's the point of the endpoint.
 * Public sign-up refuses the role because it's unauthenticated; here the caller
 * has already proved they're an admin, and until now the only route to a second
 * admin account was the seeder, which is no answer in production.
 */
@Data
public class AdminCreateUserRequest {

    /** Digits in a KNUST student ID. */
    private static final String STUDENT_ID_PATTERN = "\\d{8}";

    /** Digits in a KNUST staff ID. */
    private static final String STAFF_ID_PATTERN = "\\d{9}";

    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    @Pattern(
            regexp = "^[^@\\s]+@([a-z0-9-]+\\.)*knust\\.edu\\.gh$",
            flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "Use a KNUST email address (e.g. name@knust.edu.gh)")
    private String email;

    @NotBlank
    private String staffOrStudentId;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotNull
    private Role role;

    private String department;

    /**
     * Students carry 8 digits and lecturers 9, so the rule depends on the role
     * and can't live on the field. Admin IDs are institution-issued staff
     * numbers with no published format, so they're only required to be
     * non-blank — {@code @NotBlank} above already covers that.
     */
    @JsonIgnore
    @AssertTrue(message = "Student ID must be exactly 8 digits and Staff ID exactly 9 digits")
    public boolean isStaffOrStudentIdValid() {
        if (role == null || role == Role.ADMIN) {
            return true;
        }
        if (staffOrStudentId == null || staffOrStudentId.isBlank()) {
            return true; // @NotBlank already reports this — don't double up the message
        }
        String id = staffOrStudentId.trim();
        return role == Role.LECTURER ? id.matches(STAFF_ID_PATTERN) : id.matches(STUDENT_ID_PATTERN);
    }
}
