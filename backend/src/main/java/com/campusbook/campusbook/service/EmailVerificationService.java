package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.EmailVerificationToken;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.repository.EmailVerificationTokenRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Self-registration email verification by emailed one-time code (OTP), mirroring
 * {@link PasswordResetService}'s shape exactly. A freshly self-registered account
 * can't log in (see AuthController.login) until the code it was mailed at
 * registration time is confirmed here.
 *
 * <p>Unlike password reset, there are two legitimate triggers for a fresh code —
 * the automatic send right after registration, and an explicit resend — so
 * {@link #requestVerification} serves both instead of having one caller.
 */
@Service
public class EmailVerificationService {

    /** Digits in the emailed code. */
    private static final int CODE_LENGTH = 6;

    /** How long a code stays valid. */
    static final int EXPIRY_MINUTES = 10;

    /** Wrong guesses allowed against one code before it's burned. */
    private static final int MAX_ATTEMPTS = 5;

    /** Deliberately generic — never reveals whether the account or the code was the problem. */
    private static final String GENERIC_FAILURE = "That code is invalid or has expired. Request a new one.";

    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationMailer mailer;

    public EmailVerificationService(UserRepository userRepository,
                                    EmailVerificationTokenRepository tokenRepository,
                                    PasswordEncoder passwordEncoder,
                                    EmailVerificationMailer mailer) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailer = mailer;
    }

    /**
     * (Re)send a verification code. Deliberately does nothing observable when no
     * such account exists, or when it's already verified — the caller can't tell
     * either apart, which is what stops this from being an account-enumeration or
     * verification-status oracle.
     */
    @Transactional
    public void requestVerification(String emailOrId) {
        Optional<User> maybeUser = findByEmailOrId(emailOrId);
        if (maybeUser.isEmpty()) {
            return; // silent no-op — see Javadoc
        }
        User user = maybeUser.get();
        if (user.isEmailVerified()) {
            return; // silent no-op — nothing to (re)send
        }

        LocalDateTime now = LocalDateTime.now();
        tokenRepository.invalidateAllForUser(user.getId(), now);

        String code = generateCode();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(passwordEncoder.encode(code));
        token.setExpiresAt(now.plusMinutes(EXPIRY_MINUTES));
        token.setCreatedAt(now);
        tokenRepository.save(token);

        mailer.sendVerificationCode(user, code, EXPIRY_MINUTES);
    }

    /**
     * Complete verification: check the code against the account's active token and
     * mark it verified. Idempotent for an already-verified account — a stale verify
     * screen re-opened after verifying elsewhere (or a double submit) must not
     * error out. Every failure returns the same generic message so a caller learns
     * nothing about which part was wrong.
     */
    @Transactional
    public User confirmVerification(String emailOrId, String code) {
        User user = findByEmailOrId(emailOrId)
                .orElseThrow(() -> new InvalidCredentialsException(GENERIC_FAILURE));

        if (user.isEmailVerified()) {
            return user;
        }

        EmailVerificationToken token = tokenRepository
                .findActiveForUser(user.getId(), LocalDateTime.now())
                .orElseThrow(() -> new InvalidCredentialsException(GENERIC_FAILURE));

        if (!passwordEncoder.matches(code, token.getTokenHash())) {
            token.setAttempts(token.getAttempts() + 1);
            if (token.getAttempts() >= MAX_ATTEMPTS) {
                // Burn the code so a guessing run can't keep going against it.
                token.setConsumedAt(LocalDateTime.now());
            }
            tokenRepository.save(token);
            throw new InvalidCredentialsException(GENERIC_FAILURE);
        }

        token.setConsumedAt(LocalDateTime.now());
        tokenRepository.save(token);

        user.setEmailVerified(true);
        return userRepository.save(user);
    }

    private Optional<User> findByEmailOrId(String emailOrId) {
        String handle = emailOrId == null ? "" : emailOrId.trim();
        return userRepository.findByEmail(handle)
                .or(() -> userRepository.findByStaffOrStudentId(handle));
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, CODE_LENGTH);      // 1_000_000 for 6 digits
        return String.format("%0" + CODE_LENGTH + "d", random.nextInt(bound));
    }
}
