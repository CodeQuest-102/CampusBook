package com.campusbook.campusbook.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import com.campusbook.campusbook.enums.SubscriptionTier;

/**
 * Platform-admin only: creates a brand-new institution together with its
 * first admin account in one request, so onboarding can never leave a
 * half-created institution with no one able to log into it.
 *
 * <p>No hardcoded email pattern on either address — same reasoning as
 * {@link RegisterRequest}/{@link AdminCreateUserRequest}: domain legitimacy
 * is checked in the service layer (the admin's email must belong to the
 * institution's own domain), where it can actually be verified.
 */
@Data
public class CreatePlatformInstitutionRequest {

    @NotBlank
    private String institutionName;

    @NotBlank
    private String emailDomain;

    @NotNull
    private SubscriptionTier tier;

    @NotBlank
    private String adminFullName;

    @Email
    @NotBlank
    private String adminEmail;

    @NotBlank
    private String adminStaffOrStudentId;

    @NotBlank
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String adminPassword;

    private String adminDepartment;
}
