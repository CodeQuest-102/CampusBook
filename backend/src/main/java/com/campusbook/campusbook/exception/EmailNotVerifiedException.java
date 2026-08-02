package com.campusbook.campusbook.exception;

/**
 * Thrown by login when the account's password is correct but its email hasn't
 * been verified yet. Deliberately NOT a subtype of {@link InvalidCredentialsException}
 * — it must map to a different HTTP status (403, not 401) so the frontend can
 * route the user to the verification screen instead of showing "wrong password."
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
