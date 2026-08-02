package com.campusbook.campusbook.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BrevoClientTest {

    private static final String BASE_URL = "https://api.brevo.com/v3";

    private MockRestServiceServer server;

    private BrevoClient client(String from) {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        return new BrevoClient(builder.build(), "xkeysib-test-key", from);
    }

    @Test
    void send_postsTheRightShapeWithTheApiKeyHeader() {
        BrevoClient client = client("CampusBook <no-reply@campusbook.local>");
        server.expect(requestTo(BASE_URL + "/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "xkeysib-test-key"))
                .andExpect(jsonPath("$.sender.name").value("CampusBook"))
                .andExpect(jsonPath("$.sender.email").value("no-reply@campusbook.local"))
                .andExpect(jsonPath("$.to[0].email").value("student@knust.edu.gh"))
                .andExpect(jsonPath("$.to[0].name").value("A Student"))
                .andExpect(jsonPath("$.subject").value("Your CampusBook password reset code"))
                .andExpect(jsonPath("$.textContent").value("the body"))
                .andRespond(withSuccess("{\"messageId\":\"abc\"}", MediaType.APPLICATION_JSON));

        client.send("student@knust.edu.gh", "A Student", "Your CampusBook password reset code", "the body");

        server.verify();
    }

    @Test
    void send_parsesTheNameOutOfAQuotedFromAddress() {
        BrevoClient client = client("  CampusBook  <no-reply@campusbook.local>  ");
        server.expect(requestTo(BASE_URL + "/smtp/email"))
                .andExpect(jsonPath("$.sender.name").value("CampusBook"))
                .andExpect(jsonPath("$.sender.email").value("no-reply@campusbook.local"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        client.send("a@b.com", "A", "subject", "body");

        server.verify();
    }

    @Test
    void send_fallsBackToADefaultNameWhenFromHasNoAngleBrackets() {
        BrevoClient client = client("no-reply@campusbook.local");
        server.expect(requestTo(BASE_URL + "/smtp/email"))
                .andExpect(jsonPath("$.sender.name").value("CampusBook"))
                .andExpect(jsonPath("$.sender.email").value("no-reply@campusbook.local"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        client.send("a@b.com", "A", "subject", "body");

        server.verify();
    }

    @Test
    void send_throwsOnATransportFailure() {
        BrevoClient client = client("CampusBook <no-reply@campusbook.local>");
        server.expect(requestTo(BASE_URL + "/smtp/email"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.send("a@b.com", "A", "subject", "body"))
                .isInstanceOf(RestClientException.class);
    }
}
