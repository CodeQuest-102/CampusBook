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

import java.util.EnumSet;
import java.util.Set;

@Data
public class RegisterRequest {

    /**
     * Roles a member of the public may create for themselves. ADMIN is absent
     * deliberately: admin accounts reach room management, request approval, the
     * user directory, reports and subscription settings, so they're provisioned
     * by the institution (see DataSeeder) rather than self-registered. Anything
     * privileged added later must stay out of this set.
     */
    private static final Set<Role> SELF_REGISTERABLE_ROLES =
            EnumSet.of(Role.STUDENT_LEADER, Role.LECTURER);

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
            message = "Use your KNUST email address (e.g. you@st.knust.edu.gh)")
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
     * /api/auth/register is unauthenticated, so the submitted role is untrusted
     * input — without this an anonymous caller could hand themselves an admin
     * account. The sign-up UI only ever offers Student Leader and Lecturer; this
     * is the server-side enforcement of that.
     */
    @JsonIgnore
    @AssertTrue(message = "Role must be STUDENT_LEADER or LECTURER — admin accounts are provisioned by the institution")
    public boolean isRoleSelfRegisterable() {
        return role == null || SELF_REGISTERABLE_ROLES.contains(role); // @NotNull owns the null case
    }

    /**
     * KNUST IDs are role-dependent — students carry 8 digits, staff 9 — so this
     * can't be expressed as a @Pattern on the field itself.
     */
    @JsonIgnore
    @AssertTrue(message = "Student ID must be exactly 8 digits and Staff ID exactly 9 digits")
    public boolean isStaffOrStudentIdValid() {
        if (role == null || !SELF_REGISTERABLE_ROLES.contains(role)) {
            // @NotNull and isRoleSelfRegisterable own these; reporting a digit
            // rule for a role that can't register at all would only add noise.
            return true;
        }
        if (staffOrStudentId == null || staffOrStudentId.isBlank()) {
            return true; // @NotBlank already reports this — don't double up the message
        }
        String id = staffOrStudentId.trim();
        return role == Role.LECTURER ? id.matches(STAFF_ID_PATTERN) : id.matches(STUDENT_ID_PATTERN);
    }
}
