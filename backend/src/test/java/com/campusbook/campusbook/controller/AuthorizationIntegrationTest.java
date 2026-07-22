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
    void register_withNonKnustEmail_is400() throws Exception {
        String body = """
                {"fullName":"Outsider","email":"outsider@gmail.com",
                 "staffOrStudentId":"20551298","password":"password1","role":"STUDENT_LEADER"}""";
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
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
