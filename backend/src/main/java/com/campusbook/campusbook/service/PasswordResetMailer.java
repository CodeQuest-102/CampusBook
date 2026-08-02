package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Delivers password-reset codes. Two modes, chosen by {@code app.mail.enabled}:
 *
 * <ul>
 *   <li><b>off (default)</b> — logs the code to the console with a banner, so the
 *       reset flow is fully demoable with no Brevo account configured.</li>
 *   <li><b>on</b> — sends the code via Brevo's transactional email HTTP API
 *       ({@link BrevoClient}), configured from {@code BREVO_API_KEY} / {@code MAIL_FROM}.</li>
 * </ul>
 *
 * Delivery is best-effort: a send failure is logged but never propagated, so a
 * flaky mail provider can't roll back the token that was already issued, nor leak
 * delivery detail to the caller (which would also reveal that the account exists).
 */
@Component
public class PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final boolean mailEnabled;
    private final BrevoClient brevoClient;

    public PasswordResetMailer(@Value("${app.mail.enabled:false}") boolean mailEnabled,
                               BrevoClient brevoClient) {
        this.mailEnabled = mailEnabled;
        this.brevoClient = brevoClient;
    }

    public void sendResetCode(User user, String code, int expiryMinutes) {
        if (!mailEnabled) {
            log.info("""

                    ========================================================
                     PASSWORD RESET CODE (mail disabled — dev/demo mode)
                     Account : {} <{}>
                     Code    : {}   (valid {} minutes)
                    ========================================================""",
                    user.getFullName(), user.getEmail(), code, expiryMinutes);
            return;
        }

        try {
            brevoClient.send(user.getEmail(), user.getFullName(),
                    "Your CampusBook password reset code",
                    "Hi " + user.getFullName() + ",\n\n"
                            + "Your CampusBook password reset code is: " + code + "\n\n"
                            + "It expires in " + expiryMinutes + " minutes. If you didn't request a\n"
                            + "password reset, you can ignore this email — your password stays unchanged.\n\n"
                            + "— CampusBook");
        } catch (Exception e) {
            // Best-effort: don't fail the request or reveal the account exists.
            log.error("Failed to send password reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
