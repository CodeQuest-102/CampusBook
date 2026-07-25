package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.PasswordResetToken;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.repository.PasswordResetTokenRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Self-service password reset by emailed one-time code (OTP).
 *
 * The previous flow reset any account given an email plus a staff/student ID —
 * both semi-public and guessable — which was an account-takeover path. This flow
 * requires possession of a short-lived code delivered to the account's own inbox.
 * Only a hash of the code is stored; codes expire, are single-use, and hard-fail
 * after {@link #MAX_ATTEMPTS} wrong tries.
 */
@Service
public class PasswordResetService {

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
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailer mailer;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordResetMailer mailer) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailer = mailer;
    }

    /**
     * Begin a reset for whoever {@code emailOrId} identifies. Deliberately does
     * nothing observable when no such account exists — the caller can't tell,
     * which is what stops this endpoint from being an account-enumeration oracle.
     */
    @Transactional
    public void requestReset(String emailOrId) {
        Optional<User> maybeUser = findByEmailOrId(emailOrId);
        if (maybeUser.isEmpty()) {
            return; // silent no-op — see Javadoc
        }
        User user = maybeUser.get();

        // Only one live code per account: invalidate anything outstanding first.
        LocalDateTime now = LocalDateTime.now();
        tokenRepository.invalidateAllForUser(user.getId(), now);

        String code = generateCode();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(passwordEncoder.encode(code));
        token.setExpiresAt(now.plusMinutes(EXPIRY_MINUTES));
        token.setCreatedAt(now);
        tokenRepository.save(token);

        mailer.sendResetCode(user, code, EXPIRY_MINUTES);
    }

    /**
     * Complete a reset: verify the code against the account's active token and set
     * the new password. Every failure returns the same generic message so a caller
     * learns nothing about which part was wrong.
     */
    @Transactional
    public void confirmReset(String emailOrId, String code, String newPassword) {
        User user = findByEmailOrId(emailOrId)
                .orElseThrow(() -> new InvalidCredentialsException(GENERIC_FAILURE));

        PasswordResetToken token = tokenRepository
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

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
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
