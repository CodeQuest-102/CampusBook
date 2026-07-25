package com.campusbook.campusbook.service;

import com.campusbook.campusbook.exception.PaymentException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Thin server-side wrapper over the Paystack REST API. The secret key lives here
 * and only here — the app never sees it. We initialize a transaction (so the
 * amount is set by the server, never the client) and later verify it, which is
 * the only trustworthy signal that a payment actually happened.
 *
 * @see <a href="https://paystack.com/docs/api/transaction/">Paystack transaction API</a>
 */
@Component
public class PaystackClient {

    private final RestClient rest;
    private final String secretKey;
    private final String callbackUrl;

    public PaystackClient(@Value("${paystack.base-url:https://api.paystack.co}") String baseUrl,
                          @Value("${paystack.secret-key:}") String secretKey,
                          @Value("${paystack.callback-url:}") String callbackUrl) {
        this.secretKey = secretKey;
        this.callbackUrl = callbackUrl;
        this.rest = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** The redirect URL Paystack sends the browser to after checkout; the app watches for it. */
    public String callbackUrl() {
        return callbackUrl;
    }

    /** Initializes a transaction and returns the hosted checkout URL + our reference. */
    public InitResult initialize(String email, int amountMinor, String reference,
                                 Long institutionId, String tier) {
        Map<String, Object> body = Map.of(
                "email", email,
                "amount", String.valueOf(amountMinor),
                "currency", "GHS",
                "reference", reference,
                "callback_url", callbackUrl,
                "metadata", Map.of("institutionId", institutionId, "tier", tier));
        try {
            InitResponse resp = rest.post().uri("/transaction/initialize")
                    .header("Authorization", "Bearer " + secretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(InitResponse.class);
            if (resp == null || !resp.status() || resp.data() == null) {
                throw new PaymentException("Could not start the payment. Please try again.");
            }
            return new InitResult(resp.data().authorizationUrl(), resp.data().reference());
        } catch (RestClientException e) {
            throw new PaymentException("Could not reach the payment provider. Please try again.");
        }
    }

    /** Verifies a transaction with Paystack — the server-side source of truth. */
    public VerifyResult verify(String reference) {
        try {
            VerifyResponse resp = rest.get().uri("/transaction/verify/{ref}", reference)
                    .header("Authorization", "Bearer " + secretKey)
                    .retrieve()
                    .body(VerifyResponse.class);
            if (resp == null || resp.data() == null) {
                throw new PaymentException("Could not confirm the payment. Please try again.");
            }
            VerifyData d = resp.data();
            boolean success = "success".equalsIgnoreCase(d.status());
            Long institutionId = null;
            String tier = null;
            if (d.metadata() != null) {
                institutionId = d.metadata().institutionId();
                tier = d.metadata().tier();
            }
            return new VerifyResult(success, d.amount(), d.currency(), institutionId, tier);
        } catch (RestClientException e) {
            throw new PaymentException("Could not reach the payment provider. Please try again.");
        }
    }

    public record InitResult(String authorizationUrl, String reference) {
    }

    public record VerifyResult(boolean success, Integer amount, String currency,
                               Long institutionId, String tier) {
    }

    /* ----- Paystack wire shapes (snake_case, only the fields we use) ----- */

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record InitResponse(boolean status, InitData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record InitData(@JsonProperty("authorization_url") String authorizationUrl, String reference) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VerifyResponse(boolean status, VerifyData data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VerifyData(String status, Integer amount, String currency, Metadata metadata) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Metadata(Long institutionId, String tier) {
    }
}
