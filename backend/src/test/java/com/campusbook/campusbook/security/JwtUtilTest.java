package com.campusbook.campusbook.security;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-at-least-32-bytes-long-for-hmac-sha256";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 3600_000L);
        jwtUtil.init();
    }

    @Test
    void generateToken_roundTripsTheSubjectEmail() {
        String token = jwtUtil.generateToken("student@campusbook.local");

        assertThat(jwtUtil.extractEmail(token)).isEqualTo("student@campusbook.local");
        assertThat(jwtUtil.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_rejectsAnExpiredToken() {
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", -1000L);
        String expired = jwtUtil.generateToken("student@campusbook.local");

        assertThat(jwtUtil.isTokenValid(expired)).isFalse();
    }

    @Test
    void extractEmail_throwsOnAnExpiredToken() {
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", -1000L);
        String expired = jwtUtil.generateToken("student@campusbook.local");

        assertThatThrownBy(() -> jwtUtil.extractEmail(expired))
                .isInstanceOf(ExpiredJwtException.class);
    }

    /**
     * A forged or corrupted signature must never validate — this is the
     * property JwtAuthFilter's whole trust model rests on.
     */
    @Test
    void isTokenValid_rejectsATamperedSignature() {
        String token = jwtUtil.generateToken("student@campusbook.local");
        String[] parts = token.split("\\.");
        String tamperedSignature = new StringBuilder(parts[2]).reverse().toString();
        String tampered = parts[0] + "." + parts[1] + "." + tamperedSignature;

        assertThat(jwtUtil.isTokenValid(tampered)).isFalse();
    }

    @Test
    void isTokenValid_rejectsATokenSignedWithADifferentSecret() {
        String token = jwtUtil.generateToken("student@campusbook.local");

        JwtUtil otherUtil = new JwtUtil();
        ReflectionTestUtils.setField(otherUtil, "secret", "a-completely-different-secret-key-of-sufficient-length");
        ReflectionTestUtils.setField(otherUtil, "expirationMs", 3600_000L);
        otherUtil.init();

        assertThat(otherUtil.isTokenValid(token)).isFalse();
    }

    @Test
    void isTokenValid_rejectsAMalformedToken() {
        assertThat(jwtUtil.isTokenValid("not-a-jwt")).isFalse();
    }
}
