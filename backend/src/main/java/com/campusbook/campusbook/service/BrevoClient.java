package com.campusbook.campusbook.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Thin wrapper over Brevo's transactional email HTTP API. Sends over HTTPS
 * rather than SMTP: cloud hosts (Render included) commonly block outbound SMTP
 * ports (25/587/2525) by default to curb spam abuse, which makes SMTP a dead
 * end for a hosted instance — the HTTP API has no such restriction.
 *
 * @see <a href="https://developers.brevo.com/reference/sendtransacemail">Brevo transactional email API</a>
 */
@Component
public class BrevoClient {

    private static final Pattern FROM_PATTERN = Pattern.compile("^(.*)<(.+)>$");

    private final RestClient rest;
    private final String apiKey;
    private final String senderName;
    private final String senderEmail;

    @Autowired
    public BrevoClient(@Value("${brevo.base-url:https://api.brevo.com/v3}") String baseUrl,
                       @Value("${brevo.api-key:}") String apiKey,
                       @Value("${app.mail.from:CampusBook <no-reply@campusbook.local>}") String from) {
        this(RestClient.builder().baseUrl(baseUrl).build(), apiKey, from);
    }

    /** Test-only: injects a pre-built client, e.g. one bound to a MockRestServiceServer. */
    BrevoClient(RestClient rest, String apiKey, String from) {
        this.rest = rest;
        this.apiKey = apiKey;
        Matcher m = FROM_PATTERN.matcher(from.trim());
        if (m.matches()) {
            this.senderName = m.group(1).trim();
            this.senderEmail = m.group(2).trim();
        } else {
            this.senderName = "CampusBook";
            this.senderEmail = from.trim();
        }
    }

    /** Sends a plain-text transactional email. Throws on any transport/API failure. */
    public void send(String toEmail, String toName, String subject, String textContent) {
        SendEmailRequest body = new SendEmailRequest(
                new Sender(senderName, senderEmail),
                List.of(new Recipient(toEmail, toName)),
                subject,
                textContent);
        rest.post().uri("/smtp/email")
                .header("api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    private record SendEmailRequest(Sender sender, List<Recipient> to, String subject, String textContent) {
    }

    private record Sender(String name, String email) {
    }

    private record Recipient(String email, String name) {
    }
}
