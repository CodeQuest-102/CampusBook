package com.campusbook.campusbook.dto;

/**
 * The result of initializing a Paystack transaction: the hosted checkout URL the
 * app opens, the reference the app hands back to {@code /verify} afterwards, and
 * the callback URL the app watches for in its WebView to know payment is done
 * (returned here so the app never has to hard-code the server's configured value).
 */
public record CheckoutResponse(
        String authorizationUrl,
        String reference,
        String callbackUrl
) {
}
