package com.campusbook.campusbook.service;

import com.campusbook.campusbook.exception.PaymentException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Exercises the actual response parsing against a mocked HTTP transport — the
 * consumer-side tests in SubscriptionServiceTest mock PaystackClient itself, so
 * they never verify this class correctly reads Paystack's wire format.
 */
class PaystackClientTest {

    private static final String BASE_URL = "https://api.paystack.co";

    private MockRestServiceServer server;
    private PaystackClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PaystackClient(builder.build(), "sk_test_secret", "https://app.campusbook.example/callback");
    }

    @Test
    void initialize_parsesAuthorizationUrlAndReference() {
        server.expect(requestTo(BASE_URL + "/transaction/initialize"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer sk_test_secret"))
                .andRespond(withSuccess("""
                        {"status":true,"message":"ok","data":{
                          "authorization_url":"https://checkout.paystack.com/abc","reference":"CB-1-abc"}}
                        """, MediaType.APPLICATION_JSON));

        PaystackClient.InitResult result = client.initialize(
                "admin@knust.edu.gh", 50000, "CB-1-abc", 1L, "CAMPUS_PRO");

        assertThat(result.authorizationUrl()).isEqualTo("https://checkout.paystack.com/abc");
        assertThat(result.reference()).isEqualTo("CB-1-abc");
        server.verify();
    }

    @Test
    void initialize_rejectsAnUnsuccessfulStatus() {
        server.expect(requestTo(BASE_URL + "/transaction/initialize"))
                .andRespond(withSuccess("""
                        {"status":false,"message":"Invalid key","data":null}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.initialize("a@b.com", 50000, "ref", 1L, "CAMPUS_PRO"))
                .isInstanceOf(PaymentException.class);
    }

    @Test
    void initialize_wrapsATransportFailureAsPaymentException() {
        server.expect(requestTo(BASE_URL + "/transaction/initialize"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.initialize("a@b.com", 50000, "ref", 1L, "CAMPUS_PRO"))
                .isInstanceOf(PaymentException.class)
                .hasMessageContaining("Could not reach");
    }

    @Test
    void verify_parsesSuccessAmountCurrencyAndMetadata() {
        server.expect(requestTo(BASE_URL + "/transaction/verify/CB-1-abc"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer sk_test_secret"))
                .andRespond(withSuccess("""
                        {"status":true,"message":"ok","data":{
                          "status":"success","amount":50000,"currency":"GHS",
                          "metadata":{"institutionId":1,"tier":"CAMPUS_PRO"}}}
                        """, MediaType.APPLICATION_JSON));

        PaystackClient.VerifyResult result = client.verify("CB-1-abc");

        assertThat(result.success()).isTrue();
        assertThat(result.amount()).isEqualTo(50000);
        assertThat(result.currency()).isEqualTo("GHS");
        assertThat(result.institutionId()).isEqualTo(1L);
        assertThat(result.tier()).isEqualTo("CAMPUS_PRO");
    }

    /**
     * A failed/abandoned transaction is a normal Paystack response, not a
     * transport error — SubscriptionService relies on `success()` being false
     * rather than an exception to reject it as "not completed".
     */
    @Test
    void verify_reportsAFailedTransactionAsUnsuccessfulRatherThanThrowing() {
        server.expect(requestTo(BASE_URL + "/transaction/verify/ref"))
                .andRespond(withSuccess("""
                        {"status":true,"message":"ok","data":{
                          "status":"failed","amount":50000,"currency":"GHS","metadata":null}}
                        """, MediaType.APPLICATION_JSON));

        PaystackClient.VerifyResult result = client.verify("ref");

        assertThat(result.success()).isFalse();
        assertThat(result.institutionId()).isNull();
        assertThat(result.tier()).isNull();
    }

    @Test
    void verify_missingDataThrowsPaymentException() {
        server.expect(requestTo(BASE_URL + "/transaction/verify/ref"))
                .andRespond(withSuccess("""
                        {"status":false,"message":"Transaction not found","data":null}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.verify("ref"))
                .isInstanceOf(PaymentException.class);
    }

    @Test
    void verify_wrapsATransportFailureAsPaymentException() {
        server.expect(requestTo(BASE_URL + "/transaction/verify/ref"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.verify("ref"))
                .isInstanceOf(PaymentException.class)
                .hasMessageContaining("Could not reach");
    }
}
