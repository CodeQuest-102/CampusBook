package com.campusbook.campusbook.exception;

/**
 * A payment could not be confirmed — the Paystack transaction was not successful,
 * did not match the plan's amount, or did not belong to the caller's institution.
 * Mapped to HTTP 402 (Payment Required).
 */
public class PaymentException extends RuntimeException {
    public PaymentException(String message) {
        super(message);
    }
}
