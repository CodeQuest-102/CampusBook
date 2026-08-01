package com.campusbook.campusbook.exception;

/** A referenced entity (hall, booking, user, ...) doesn't exist — maps to 404. */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
