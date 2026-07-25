package com.campusbook.campusbook.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Fails fast under the {@code prod} profile if the app would start with insecure
 * defaults. A running-but-insecure production instance is worse than one that
 * won't boot — the crash forces the operator to set real values before anything
 * is exposed. Only the prod profile is guarded, so local development keeps its
 * convenient fallbacks.
 */
@Configuration
@Profile("prod")
public class ProductionConfigGuard {

    /** The development fallback in application.properties — never valid in prod. */
    private static final String DEFAULT_JWT_SECRET =
            "campusbook-super-secret-key-change-this-later-12345678";

    private final String jwtSecret;
    private final String allowedOrigins;

    public ProductionConfigGuard(@Value("${jwt.secret}") String jwtSecret,
                                 @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.jwtSecret = jwtSecret;
        this.allowedOrigins = allowedOrigins;
    }

    @PostConstruct
    void verify() {
        if (DEFAULT_JWT_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException(
                    "JWT_SECRET is still the bundled development default. Set a unique secret "
                            + "(>= 32 bytes) before running the prod profile.");
        }
        if (allowedOrigins == null || allowedOrigins.isBlank() || allowedOrigins.contains("*")) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS must list explicit origins under the prod profile — "
                            + "a wildcard (\"*\") is not allowed. Set your real frontend host(s).");
        }
    }
}
