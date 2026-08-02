package com.campusbook.campusbook.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end authorization checks over the real security chain (JwtAuthFilter →
 * granted authorities → {@code @PreAuthorize}). Nothing here mocks security, so a
 * passing run is evidence the role gates actually hold at the HTTP layer — the
 * gap that service-level unit tests can't cover. Uses the seeded demo accounts.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthorizationIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    /** Log in a seeded account and return its bearer token. */
    private String tokenFor(String emailOrId, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                new java.util.LinkedHashMap<>() {{
                    put("emailOrId", emailOrId);
                    put("password", password);
                }});
        String json = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(json);
        return node.get("token").asText();
    }

    private String adminToken() throws Exception {
        return tokenFor("admin@campusbook.local", "admin12345");
    }

    private String studentToken() throws Exception {
        return tokenFor("student@campusbook.local", "student12345");
    }

    private String platformAdminToken() throws Exception {
        return tokenFor("platform@campusbook.local", "platform12345");
    }

    /* --------------------------- unauthenticated --------------------------- */

    @Test
    void protectedEndpoint_withoutToken_is401() throws Exception {
        mvc.perform(get("/api/halls"))
                .andExpect(status().isUnauthorized());
    }

    /* ------------------------- admin-only: bookings ------------------------ */

    @Test
    void pendingBookings_asStudent_is403() throws Exception {
        mvc.perform(get("/api/bookings/pending").header("Authorization", "Bearer " + studentToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void pendingBookings_asAdmin_is200() throws Exception {
        mvc.perform(get("/api/bookings/pending").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void approveBooking_asStudent_is403() throws Exception {
        // @PreAuthorize runs before the handler, so the booking id needn't exist.
        mvc.perform(post("/api/bookings/1/approve").header("Authorization", "Bearer " + studentToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectBooking_asStudent_is403() throws Exception {
        mvc.perform(post("/api/bookings/1/reject").header("Authorization", "Bearer " + studentToken()))
                .andExpect(status().isForbidden());
    }

    /* --------------------------- admin-only: halls ------------------------- */

    @Test
    void createHall_asStudent_is403() throws Exception {
        String hall = """
                {"block":"X","roomCode":"ZZ9","capacity":10,"hasProjector":false,
                 "hasAC":false,"hasMicrophone":false,"active":true}""";
        mvc.perform(post("/api/halls")
                        .header("Authorization", "Bearer " + studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hall))
                .andExpect(status().isForbidden());
    }

    /* ----------------------- admin-only: provisioning ---------------------- */

    @Test
    void createUser_withoutToken_is401() throws Exception {
        mvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * The endpoint may create ADMIN accounts, which is exactly why it has to be
     * shut to everyone else — otherwise it reopens the escalation that
     * {@code register_asAdminRole_is400} closes on the public route.
     */
    @Test
    void createUser_asStudent_is403() throws Exception {
        String body = """
                {"fullName":"Sneaky Admin","email":"sneaky.admin@knust.edu.gh",
                 "staffOrStudentId":"ADMIN999","password":"password1","role":"ADMIN"}""";
        mvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + studentToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    /**
     * Email and campus ID are unique for the life of the database, and this
     * suite runs against a real one — so a fixed identity here would pass once
     * and then fail on every later run as a duplicate. Both are randomised per
     * run to keep the test repeatable.
     */
    @Test
    void createUser_asAdmin_is201() throws Exception {
        String staffId = String.valueOf(200_000_000 + new java.util.Random().nextInt(99_999_999));
        String body = """
                {"fullName":"Provisioned Lecturer","email":"provisioned.%s@knust.edu.gh",
                 "staffOrStudentId":"%s","password":"password1","role":"LECTURER",
                 "department":"History"}""".formatted(staffId, staffId);
        mvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void createUser_withNonKnustEmail_is400() throws Exception {
        // Rejected on the address before uniqueness is ever consulted, so a
        // fixed ID is safe here.
        String body = """
                {"fullName":"Outsider","email":"outsider.admin@gmail.com",
                 "staffOrStudentId":"200977778","password":"password1","role":"LECTURER"}""";
        mvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    /* --------------------- register: input can't escalate ------------------ */

    @Test
    void register_asAdminRole_is400() throws Exception {
        String body = """
                {"fullName":"Sneaky","email":"sneaky@st.knust.edu.gh",
                 "staffOrStudentId":"20551299","password":"password1","role":"ADMIN"}""";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_withUnrecognizedDomain_is400() throws Exception {
        // No institution has this domain registered — UserService.registerUser
        // can't resolve which campus this belongs to.
        String body = """
                {"fullName":"Outsider","email":"outsider@gmail.com",
                 "staffOrStudentId":"20551298","password":"password1","role":"STUDENT_LEADER"}""";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_withRidgeviewEmail_is200() throws Exception {
        // Proves domain-based resolution works end-to-end for a second seeded
        // institution, not just the original KNUST one.
        String staffId = String.valueOf(20_000_000 + new java.util.Random().nextInt(999_999));
        String body = """
                {"fullName":"Ridgeview Student","email":"student.%s@ridgeview.edu",
                 "staffOrStudentId":"%s","password":"password1","role":"STUDENT_LEADER"}""".formatted(staffId, staffId);
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    void register_withLookalikeDomain_is400() throws Exception {
        String body = """
                {"fullName":"Sneaky","email":"sneaky@knust.edu.gh.evil.com",
                 "staffOrStudentId":"20551297","password":"password1","role":"STUDENT_LEADER"}""";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    /* --------------------------- platform-admin only ------------------------ */

    @Test
    void listInstitutions_withoutToken_is401() throws Exception {
        mvc.perform(get("/api/platform/institutions"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * The test that actually proves PLATFORM_ADMIN doesn't accidentally widen
     * what a regular institution ADMIN can reach — a platform admin is a
     * separate role, not an ADMIN with extra powers, so an ordinary campus
     * admin must be shut out of the cross-institution endpoints just like
     * everyone else.
     */
    @Test
    void listInstitutions_asRegularAdmin_is403() throws Exception {
        mvc.perform(get("/api/platform/institutions").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void listInstitutions_asPlatformAdmin_is200() throws Exception {
        mvc.perform(get("/api/platform/institutions").header("Authorization", "Bearer " + platformAdminToken()))
                .andExpect(status().isOk());
    }

    @Test
    void createInstitution_asRegularAdmin_is403() throws Exception {
        // A well-formed body, so this proves the role gate itself rejects the
        // request — not bean validation short-circuiting on an empty one.
        String body = """
                {"institutionName":"Sneaky School","emailDomain":"sneaky.edu",
                 "tier":"FREE","adminFullName":"Sneaky Admin","adminEmail":"admin@sneaky.edu",
                 "adminStaffOrStudentId":"SNEAKY001","adminPassword":"password1"}""";
        mvc.perform(post("/api/platform/institutions")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    /**
     * Institution name and email domain are both unique for the life of the
     * database, and this suite runs against a real one — so a fixed identity
     * here would pass once and then fail on every later run as a duplicate.
     * Both are randomised per run to keep the test repeatable.
     */
    @Test
    void createInstitution_asPlatformAdmin_is201() throws Exception {
        String suffix = String.valueOf(300_000_000 + new java.util.Random().nextInt(99_999_999));
        String body = """
                {"institutionName":"Test Institution %s","emailDomain":"test-%s.edu",
                 "tier":"FREE","adminFullName":"New Admin","adminEmail":"admin@test-%s.edu",
                 "adminStaffOrStudentId":"NEW%s","adminPassword":"password1"}""".formatted(suffix, suffix, suffix, suffix);
        mvc.perform(post("/api/platform/institutions")
                        .header("Authorization", "Bearer " + platformAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    /* ------------------------- reset: bad code is 401 ---------------------- */

    @Test
    void resetPassword_withBadCode_is401() throws Exception {
        String body = """
                {"emailOrId":"student@campusbook.local","otp":"000000","newPassword":"whatever1"}""";
        mvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }
}
