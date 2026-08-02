package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.AuthResponse;
import com.campusbook.campusbook.dto.ForgotPasswordRequest;
import com.campusbook.campusbook.dto.LoginRequest;
import com.campusbook.campusbook.dto.RegisterRequest;
import com.campusbook.campusbook.dto.RegisterResponse;
import com.campusbook.campusbook.dto.ResendVerificationRequest;
import com.campusbook.campusbook.dto.ResetPasswordRequest;
import com.campusbook.campusbook.dto.VerifyEmailRequest;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.EmailNotVerifiedException;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.security.AttemptLimiter;
import com.campusbook.campusbook.security.JwtUtil;
import com.campusbook.campusbook.service.EmailVerificationService;
import com.campusbook.campusbook.service.PasswordResetService;
import com.campusbook.campusbook.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** All auth-endpoint limits reset after this window. */
    private static final Duration RATE_WINDOW = Duration.ofMinutes(15);
    /** Failed logins per account handle before login is locked out. */
    private static final int MAX_LOGIN_FAILURES = 5;
    /** Reset-code requests per account handle (each one sends an email). */
    private static final int MAX_FORGOT_REQUESTS = 3;
    /** Reset-code submissions per client IP (guards OTP guessing). */
    private static final int MAX_RESET_ATTEMPTS = 10;
    /** Verification-code submissions per client IP (guards OTP guessing). */
    private static final int MAX_VERIFY_ATTEMPTS = 10;
    /** Verification-code requests per account handle (each one sends an email). */
    private static final int MAX_RESEND_REQUESTS = 3;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AttemptLimiter attemptLimiter;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setStaffOrStudentId(request.getStaffOrStudentId());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());
        user.setDepartment(request.getDepartment());

        User saved = userService.registerUser(user);
        emailVerificationService.requestVerification(saved.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED).body(new RegisterResponse(
                saved.getFullName(), saved.getEmail(), saved.getRole().name()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String key = "login:" + handle(request.getEmailOrId());
        attemptLimiter.assertNotBlocked(key, MAX_LOGIN_FAILURES, RATE_WINDOW,
                "Too many failed sign-in attempts. Please try again in 15 minutes.");
        try {
            User user = userService.findByEmailOrStaffId(request.getEmailOrId());
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new InvalidCredentialsException("Invalid credentials");
            }
            attemptLimiter.reset(key); // clean slate on success

            // Not an InvalidCredentialsException on purpose — the password was
            // correct, so this shouldn't count against the failed-login lockout,
            // and it needs a distinct status (see EmailNotVerifiedException).
            if (!user.isEmailVerified()) {
                throw new EmailNotVerifiedException(
                        "Please verify your email before signing in. Check your inbox for the code we sent you.");
            }

            String token = jwtUtil.generateToken(user.getEmail());
            return ResponseEntity.ok(new AuthResponse(
                    token, user.getFullName(), user.getEmail(), user.getRole().name()
            ));
        } catch (InvalidCredentialsException e) {
            // Count only failures — a legitimate user signing in repeatedly isn't a threat.
            attemptLimiter.recordFailure(key, RATE_WINDOW);
            throw e;
        }
    }

    /** Submit the emailed code to finish verifying a self-registered account. */
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request,
                                                     HttpServletRequest http) {
        // Keyed by IP: the OTP-guessing surface is per client, not per account.
        String key = "verify:" + http.getRemoteAddr();
        attemptLimiter.assertNotBlocked(key, MAX_VERIFY_ATTEMPTS, RATE_WINDOW,
                "Too many verification attempts. Please try again in 15 minutes.");
        attemptLimiter.recordFailure(key, RATE_WINDOW);

        User user = emailVerificationService.confirmVerification(request.getEmailOrId(), request.getOtp());
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(
                token, user.getFullName(), user.getEmail(), user.getRole().name()
        ));
    }

    /**
     * Ask for a fresh verification code. Always returns 204, whether or not the
     * account exists (or is already verified) — same account-enumeration
     * protection as /forgot-password.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        String key = "resend-verify:" + handle(request.getEmailOrId());
        attemptLimiter.assertNotBlocked(key, MAX_RESEND_REQUESTS, RATE_WINDOW,
                "Too many verification requests for this account. Please try again in 15 minutes.");
        attemptLimiter.recordFailure(key, RATE_WINDOW); // every request counts — each sends an email

        emailVerificationService.requestVerification(request.getEmailOrId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Step 1 — request a reset code. Always returns 204, whether or not the
     * account exists: a different response for a missing account would let an
     * anonymous caller probe which emails/IDs are registered.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String key = "forgot:" + handle(request.getEmailOrId());
        attemptLimiter.assertNotBlocked(key, MAX_FORGOT_REQUESTS, RATE_WINDOW,
                "Too many reset requests for this account. Please try again in 15 minutes.");
        attemptLimiter.recordFailure(key, RATE_WINDOW); // every request counts — each sends an email

        passwordResetService.requestReset(request.getEmailOrId());
        return ResponseEntity.noContent().build();
    }

    /** Step 2 — submit the emailed code and set a new password. */
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request,
                                              HttpServletRequest http) {
        // Keyed by IP: the OTP-guessing surface is per client, not per account.
        String key = "reset:" + http.getRemoteAddr();
        attemptLimiter.assertNotBlocked(key, MAX_RESET_ATTEMPTS, RATE_WINDOW,
                "Too many reset attempts. Please try again in 15 minutes.");
        attemptLimiter.recordFailure(key, RATE_WINDOW);

        passwordResetService.confirmReset(
                request.getEmailOrId(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    /** Normalise an account handle so casing/whitespace doesn't create separate buckets. */
    private String handle(String emailOrId) {
        return emailOrId == null ? "" : emailOrId.trim().toLowerCase();
    }
}