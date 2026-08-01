package com.campusbook.campusbook.exception;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void setUp() {
        logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
    }

    /** A missing resource (hall, booking, user, ...) — and only that — is a 404. */
    @Test
    void handleNotFound_mapsResourceNotFoundExceptionTo404() {
        ResponseEntity<ErrorResponse> response =
                handler.handleNotFound(new ResourceNotFoundException("Booking not found"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().message()).isEqualTo("Booking not found");
    }

    /**
     * IllegalArgumentException and IllegalStateException are caller-input
     * problems on a request that names a real resource (a bad time window, a
     * hall that's unavailable, a slot someone else already booked) — not a
     * missing resource, so both must be 400, never 404.
     */
    @Test
    void handleBadRequest_mapsIllegalArgumentExceptionTo400() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBadRequest(new IllegalArgumentException("Start time must be before end time"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).isEqualTo("Start time must be before end time");
    }

    @Test
    void handleBadRequest_mapsIllegalStateExceptionTo400() {
        ResponseEntity<ErrorResponse> response =
                handler.handleBadRequest(new IllegalStateException("Hall already booked for this slot"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).isEqualTo("Hall already booked for this slot");
    }

    /**
     * This is the catch-all for genuinely unexpected exceptions — a bug, a DB
     * hiccup, anything not already mapped to a specific handler. The client
     * only ever sees a generic message, so if this isn't logged, an incident
     * in production leaves no trace at all.
     */
    @Test
    void handleGeneric_logsTheExceptionAtErrorLevelAndReturnsAGenericMessage() {
        RuntimeException boom = new RuntimeException("something broke");

        ResponseEntity<ErrorResponse> response = handler.handleGeneric(boom);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().message()).isEqualTo("An unexpected error occurred");

        assertThat(appender.list).hasSize(1);
        ILoggingEvent event = appender.list.get(0);
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(event.getThrowableProxy().getMessage()).isEqualTo("something broke");
    }
}
