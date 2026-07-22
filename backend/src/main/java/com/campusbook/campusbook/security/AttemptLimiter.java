package com.campusbook.campusbook.security;

import com.campusbook.campusbook.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A small fixed-window rate limiter for the unauthenticated auth endpoints
 * (login, forgot-password, reset-password), keyed by whatever identifier the
 * caller supplies — an account handle or a client IP.
 *
 * <p>The primitives are split so a caller can count only the attempts it cares
 * about: login counts <em>failures</em> (a legitimate user logging in five times
 * shouldn't be locked out), while forgot/reset count every request. Compose
 * {@link #assertNotBlocked} before the work and {@link #recordFailure} on the
 * attempts that should accrue, and {@link #reset} to clear on success.
 *
 * <p>State is in-memory, which is correct for a single-instance deployment. A
 * multi-instance deployment would need a shared store (Redis) or a library like
 * Bucket4j so limits hold across nodes; this is deliberately the simplest thing
 * that closes the "unlimited guessing" hole without a new dependency.
 */
@Component
public class AttemptLimiter {

    /** Count of recorded attempts within a window that began at windowStart. */
    private record Window(Instant windowStart, int count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /** Reject the call if {@code key} has reached {@code max} attempts in its current window. */
    public void assertNotBlocked(String key, int max, Duration window, String message) {
        Window current = windows.get(key);
        if (current == null) return;
        Instant now = Instant.now();
        if (now.isAfter(current.windowStart().plus(window))) return; // window expired
        if (current.count() >= max) {
            throw new TooManyRequestsException(message);
        }
    }

    /** Record one attempt against {@code key}, starting a fresh window if the last has expired. */
    public void recordFailure(String key, Duration window) {
        Instant now = Instant.now();
        opportunisticSweep(now);
        windows.compute(key, (k, current) -> {
            if (current == null || now.isAfter(current.windowStart().plus(window))) {
                return new Window(now, 1);
            }
            return new Window(current.windowStart(), current.count() + 1);
        });
    }

    /** Clear a key's counter — call after a success so prior failures don't accrue. */
    public void reset(String key) {
        windows.remove(key);
    }

    /**
     * Keep the map from growing without bound as distinct keys (IPs, handles)
     * accumulate: once it's large, drop entries whose window is well past.
     */
    private void opportunisticSweep(Instant now) {
        if (windows.size() < 10_000) return;
        Instant cutoff = now.minus(Duration.ofHours(1));
        windows.values().removeIf(w -> w.windowStart().isBefore(cutoff));
    }
}
