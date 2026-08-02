package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Delivers email-verification codes. Two modes, chosen by {@code app.mail.enabled}:
 *
 * <ul>
 *   <li><b>off (default)</b> — logs the code to the console with a banner, so the
 *       verification flow is fully demoable with no Brevo account configured.</li>
 *   <li><b>on</b> — sends the code via Brevo's transactional email HTTP API
 *       ({@link BrevoClient}), configured from {@code BREVO_API_KEY} / {@code MAIL_FROM}.</li>
 * </ul>
 *
 * Delivery is best-effort: a send failure is logged but never propagated, so a
 * flaky mail provider can't roll back the token that was already issued. Mirrors
 * {@link PasswordResetMailer} exactly.
 */
@Component
public class EmailVerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationMailer.class);

    private final boolean mailEnabled;
    private final BrevoClient brevoClient;

    public EmailVerificationMailer(@Value("${app.mail.enabled:false}") boolean mailEnabled,
                                   BrevoClient brevoClient) {
        this.mailEnabled = mailEnabled;
        this.brevoClient = brevoClient;
    }

    public void sendVerificationCode(User user, String code, int expiryMinutes) {
        if (!mailEnabled) {
            log.info("""

                    ========================================================
                     EMAIL VERIFICATION CODE (mail disabled — dev/demo mode)
                     Account : {} <{}>
                     Code    : {}   (valid {} minutes)
                    ========================================================""",
                    user.getFullName(), user.getEmail(), code, expiryMinutes);
            return;
        }

        try {
            brevoClient.send(user.getEmail(), user.getFullName(),
                    "Verify your CampusBook account",
                    "Hi " + user.getFullName() + ",\n\n"
                            + "Your CampusBook email verification code is: " + code + "\n\n"
                            + "It expires in " + expiryMinutes + " minutes. Enter it in the app to finish\n"
                            + "setting up your account. If you didn't sign up for CampusBook, you can\n"
                            + "ignore this email.\n\n"
                            + "— CampusBook");
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
