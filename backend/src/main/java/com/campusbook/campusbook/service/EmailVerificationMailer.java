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
 * Delivers email-verification codes. Two modes, chosen by {@code app.mail.enabled}:
 *
 * <ul>
 *   <li><b>off (default)</b> — logs the code to the console with a banner, so the
 *       verification flow is fully demoable with no SMTP account configured.</li>
 *   <li><b>on</b> — sends the code over SMTP via {@link JavaMailSender}, configured
 *       from the standard {@code spring.mail.*} / {@code MAIL_*} properties.</li>
 * </ul>
 *
 * Delivery is best-effort: a send failure is logged but never propagated, so a
 * flaky mail server can't roll back the token that was already issued. Mirrors
 * {@link PasswordResetMailer} exactly.
 */
@Component
public class EmailVerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationMailer.class);

    private final boolean mailEnabled;
    private final String from;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public EmailVerificationMailer(@Value("${app.mail.enabled:false}") boolean mailEnabled,
                                   @Value("${app.mail.from:CampusBook <no-reply@campusbook.local>}") String from,
                                   ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailEnabled = mailEnabled;
        this.from = from;
        this.mailSenderProvider = mailSenderProvider;
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

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("app.mail.enabled=true but no JavaMailSender is configured; logging verification code instead");
            log.info("Email verification code for {}: {}", user.getEmail(), code);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(user.getEmail());
            message.setSubject("Verify your CampusBook account");
            message.setText(
                    "Hi " + user.getFullName() + ",\n\n"
                            + "Your CampusBook email verification code is: " + code + "\n\n"
                            + "It expires in " + expiryMinutes + " minutes. Enter it in the app to finish\n"
                            + "setting up your account. If you didn't sign up for CampusBook, you can\n"
                            + "ignore this email.\n\n"
                            + "— CampusBook");
            sender.send(message);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
