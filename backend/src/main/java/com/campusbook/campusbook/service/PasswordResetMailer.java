package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Delivers password-reset codes. Two modes, chosen by {@code app.mail.enabled}:
 *
 * <ul>
 *   <li><b>off (default)</b> — logs the code to the console with a banner, so the
 *       reset flow is fully demoable with no SMTP account configured.</li>
 *   <li><b>on</b> — sends the code over SMTP via {@link JavaMailSender}, configured
 *       from the standard {@code spring.mail.*} / {@code MAIL_*} properties.</li>
 * </ul>
 *
 * Delivery is best-effort: a send failure is logged but never propagated, so a
 * flaky mail server can't roll back the token that was already issued, nor leak
 * SMTP detail to the caller (which would also reveal that the account exists).
 */
@Component
public class PasswordResetMailer {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final boolean mailEnabled;
    private final String from;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public PasswordResetMailer(@Value("${app.mail.enabled:false}") boolean mailEnabled,
                               @Value("${app.mail.from:CampusBook <no-reply@campusbook.local>}") String from,
                               ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailEnabled = mailEnabled;
        this.from = from;
        this.mailSenderProvider = mailSenderProvider;
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

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            // app.mail.enabled=true but no mail sender wired — treat as misconfig,
            // fall back to the log rather than failing the request.
            log.warn("app.mail.enabled=true but no JavaMailSender is configured; logging reset code instead");
            log.info("Password reset code for {}: {}", user.getEmail(), code);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(user.getEmail());
            message.setSubject("Your CampusBook password reset code");
            message.setText(
                    "Hi " + user.getFullName() + ",\n\n"
                            + "Your CampusBook password reset code is: " + code + "\n\n"
                            + "It expires in " + expiryMinutes + " minutes. If you didn't request a\n"
                            + "password reset, you can ignore this email — your password stays unchanged.\n\n"
                            + "— CampusBook");
            sender.send(message);
        } catch (Exception e) {
            // Best-effort: don't fail the request or reveal the account exists.
            log.error("Failed to send password reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
