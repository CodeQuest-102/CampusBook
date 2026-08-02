package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    private String fullName;

    // Domain legitimacy (which institution, if any, this email belongs to) is
    // resolved against the institutions table in UserService.registerUser —
    // it can't be a @Pattern here since that can't consult the database, and
    // the set of registered institutions changes without a client release.
    @Email
    @NotBlank
    private String email;

    // Institution-issued identifiers have no universal format — a digit-count
    // rule here would be one institution's convention imposed on every other
    // registered institution — so this is only required to be non-blank.
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
}
