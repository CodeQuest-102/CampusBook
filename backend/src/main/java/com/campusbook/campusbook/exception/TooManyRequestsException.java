package com.campusbook.campusbook.exception;

/** Raised when a caller exceeds an auth-endpoint rate limit; maps to HTTP 429. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
