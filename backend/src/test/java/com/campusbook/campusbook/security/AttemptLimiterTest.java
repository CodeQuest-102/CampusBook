package com.campusbook.campusbook.security;

import com.campusbook.campusbook.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AttemptLimiterTest {

    private final Duration window = Duration.ofMinutes(15);

    @Test
    void allowsUpToTheLimitThenBlocks() {
        AttemptLimiter limiter = new AttemptLimiter();
        String key = "login:someone";

        // Five failures are allowed; the check before each of the first five passes.
        for (int i = 0; i < 5; i++) {
            assertThatCode(() -> limiter.assertNotBlocked(key, 5, window, "blocked"))
                    .doesNotThrowAnyException();
            limiter.recordFailure(key, window);
        }

        // The sixth check sees a full window and rejects.
        assertThatThrownBy(() -> limiter.assertNotBlocked(key, 5, window, "blocked"))
                .isInstanceOf(TooManyRequestsException.class)
                .hasMessage("blocked");
    }

    @Test
    void resetClearsTheCounter() {
        AttemptLimiter limiter = new AttemptLimiter();
        String key = "login:someone";

        for (int i = 0; i < 5; i++) limiter.recordFailure(key, window);
        assertThatThrownBy(() -> limiter.assertNotBlocked(key, 5, window, "blocked"))
                .isInstanceOf(TooManyRequestsException.class);

        limiter.reset(key); // e.g. a successful login

        assertThatCode(() -> limiter.assertNotBlocked(key, 5, window, "blocked"))
                .doesNotThrowAnyException();
    }

    @Test
    void separateKeysDoNotShareCounters() {
        AttemptLimiter limiter = new AttemptLimiter();
        for (int i = 0; i < 5; i++) limiter.recordFailure("login:alice", window);

        // Bob's bucket is untouched by Alice's failures.
        assertThatCode(() -> limiter.assertNotBlocked("login:bob", 5, window, "blocked"))
                .doesNotThrowAnyException();
    }

    @Test
    void expiredWindowStartsFresh() {
        AttemptLimiter limiter = new AttemptLimiter();
        String key = "reset:1.2.3.4";
        Duration tiny = Duration.ofMillis(1);

        for (int i = 0; i < 10; i++) limiter.recordFailure(key, tiny);
        // Let the 1ms window lapse, then a new attempt opens a fresh window.
        try { Thread.sleep(5); } catch (InterruptedException ignored) { }

        assertThatCode(() -> limiter.assertNotBlocked(key, 10, tiny, "blocked"))
                .doesNotThrowAnyException();
    }
}
