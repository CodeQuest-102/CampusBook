package com.campusbook.campusbook.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailDomainMatcherTest {

    /* ------------------------------- domainOf -------------------------------- */

    @Test
    void domainOf_extractsTheLowercasedDomain() {
        assertThat(EmailDomainMatcher.domainOf("Someone@KNUST.edu.gh")).isEqualTo("knust.edu.gh");
    }

    @Test
    void domainOf_returnsNullForNull() {
        assertThat(EmailDomainMatcher.domainOf(null)).isNull();
    }

    @Test
    void domainOf_returnsNullWhenThereIsNoAtSign() {
        assertThat(EmailDomainMatcher.domainOf("not-an-email")).isNull();
    }

    @Test
    void domainOf_returnsNullWhenNothingFollowsTheAtSign() {
        assertThat(EmailDomainMatcher.domainOf("someone@")).isNull();
    }

    /* -------------------------------- matches --------------------------------- */

    @Test
    void matches_acceptsAnExactDomainMatch() {
        assertThat(EmailDomainMatcher.matches("knust.edu.gh", "knust.edu.gh")).isTrue();
    }

    @Test
    void matches_acceptsASubdomain() {
        assertThat(EmailDomainMatcher.matches("st.knust.edu.gh", "knust.edu.gh")).isTrue();
    }

    @Test
    void matches_isCaseInsensitive() {
        assertThat(EmailDomainMatcher.matches("ST.KNUST.EDU.GH", "knust.edu.gh")).isTrue();
    }

    /**
     * The exact attack this guards against: appending a real domain as a
     * prefix of an attacker-controlled one. "knust.edu.gh.evil.com" ends with
     * ".edu.gh.evil.com", not ".knust.edu.gh" — so it must not match.
     */
    @Test
    void matches_rejectsALookalikeSuffixDomain() {
        assertThat(EmailDomainMatcher.matches("knust.edu.gh.evil.com", "knust.edu.gh")).isFalse();
    }

    /** "stknust.edu.gh" ends with "tknust.edu.gh", not ".knust.edu.gh" — a concatenated label isn't a subdomain. */
    @Test
    void matches_rejectsAConcatenatedLabelLookalike() {
        assertThat(EmailDomainMatcher.matches("stknust.edu.gh", "knust.edu.gh")).isFalse();
    }

    @Test
    void matches_rejectsAnUnrelatedDomain() {
        assertThat(EmailDomainMatcher.matches("gmail.com", "knust.edu.gh")).isFalse();
    }

    @Test
    void matches_returnsFalseForEitherSideNull() {
        assertThat(EmailDomainMatcher.matches(null, "knust.edu.gh")).isFalse();
        assertThat(EmailDomainMatcher.matches("knust.edu.gh", null)).isFalse();
    }
}
