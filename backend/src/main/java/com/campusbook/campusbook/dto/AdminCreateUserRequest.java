package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * An account created by an administrator for someone at their own institution.
 *
 * <p>The field rules match {@link RegisterRequest} — same email shape, same
 * password floor — with one deliberate difference: an admin <em>may</em>
 * create another ADMIN. That's the point of the endpoint. Public sign-up
 * refuses the role because it's unauthenticated; here the caller has already
 * proved they're an admin, and until now the only route to a second admin
 * account was the seeder, which is no answer in production.
 */
@Data
public class AdminCreateUserRequest {

    @NotBlank
    private String fullName;

    // Must belong to the acting admin's own institution's domain — checked in
    // UserService.createByAdmin, where the admin (and thus their institution)
    // is known; a @Pattern here can't be institution-aware.
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
}
