package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.enums.Role;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegisterRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private RegisterRequest request(Role role, String id) {
        RegisterRequest r = new RegisterRequest();
        r.setFullName("Abubakar Sadiq");
        r.setEmail("a.sadiq@st.knust.edu.gh");
        r.setPassword("password123");
        r.setRole(role);
        r.setStaffOrStudentId(id);
        return r;
    }

    /** Violated property paths, so a failure names the field that broke. */
    private Set<String> violations(RegisterRequest r) {
        return validator.validate(r).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    /**
     * Institution-issued IDs have no universal format — a digit-count rule
     * would be one institution's convention imposed on every other registered
     * institution — so any non-blank value is accepted at this layer.
     */
    @Test
    void acceptsAnyNonBlankId() {
        assertTrue(violations(request(Role.STUDENT_LEADER, "20551234")).isEmpty());
        assertTrue(violations(request(Role.LECTURER, "200912345")).isEmpty());
        assertTrue(violations(request(Role.STUDENT_LEADER, "STU-2026-001")).isEmpty());
    }

    /**
     * /api/auth/register is unauthenticated, so a self-assigned ADMIN role would
     * be privilege escalation — admin accounts reach room management, request
     * approval, the user directory, reports and subscription settings.
     */
    @Test
    void rejectsSelfRegistrationAsAdmin() {
        assertTrue(violations(request(Role.ADMIN, "ADMIN001")).contains("roleSelfRegisterable"));
    }

    @Test
    void rejectsAdminEvenWithAnOtherwiseWellFormedId() {
        assertEquals(Set.of("roleSelfRegisterable"), violations(request(Role.ADMIN, "20551234")));
    }

    @Test
    void reportsOnlyTheRoleProblemForAnAdminWithAnArbitraryId() {
        assertEquals(Set.of("roleSelfRegisterable"), violations(request(Role.ADMIN, "nope")));
    }

    @Test
    void allowsTheTwoSelfRegisterableRoles() {
        assertTrue(violations(request(Role.STUDENT_LEADER, "20551234")).isEmpty());
        assertTrue(violations(request(Role.LECTURER, "200912345")).isEmpty());
    }

    @Test
    void requiresARole() {
        // A null role previously reached the controller and NPE'd on getRole().name().
        assertTrue(violations(request(null, "20551234")).contains("role"));
    }

    @Test
    void stillReportsABlankIdAsBlankRatherThanMalformed() {
        assertEquals(Set.of("staffOrStudentId"), violations(request(Role.STUDENT_LEADER, "")));
    }

    /**
     * Domain legitimacy — which institution, if any, an email belongs to — is
     * resolved against the institutions table in UserService.registerUser, not
     * enforced here (a @Pattern can't query the database). See
     * UserServiceTest for the subdomain/lookalike/unrecognized-domain coverage
     * that used to live in this class.
     */
    @Test
    void acceptsAnyWellFormedEmailAtTheDtoLevel() {
        RegisterRequest outsideKnust = request(Role.STUDENT_LEADER, "20551234");
        outsideKnust.setEmail("someone@gmail.com");
        assertTrue(violations(outsideKnust).isEmpty());
    }

    @Test
    void rejectsAMalformedEmailAddress() {
        RegisterRequest malformed = request(Role.STUDENT_LEADER, "20551234");
        malformed.setEmail("not-an-email");
        assertTrue(violations(malformed).contains("email"));
    }

    @Test
    void requiresAPasswordOfAtLeastSixCharacters() {
        RegisterRequest tooShort = request(Role.STUDENT_LEADER, "20551234");
        tooShort.setPassword("pw123");
        assertTrue(violations(tooShort).contains("password"));

        RegisterRequest justLongEnough = request(Role.STUDENT_LEADER, "20551234");
        justLongEnough.setPassword("pw1234");
        assertTrue(violations(justLongEnough).isEmpty());
    }
}
