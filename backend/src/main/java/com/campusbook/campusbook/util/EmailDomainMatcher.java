package com.campusbook.campusbook.util;

/**
 * Institution resolution for public self-registration: an institution is
 * matched by the domain of the registering email, not by a hardcoded
 * per-institution regex (see UserService.registerUser). Kept as a small
 * static utility so the subdomain/lookalike rules are unit-testable in
 * isolation from persistence.
 */
public final class EmailDomainMatcher {

    private EmailDomainMatcher() {
    }

    /**
     * The domain portion of an email address, lowercased. Returns null for an
     * address with no '@' or nothing after it — callers treat that as "no
     * match" rather than throwing, since {@code @Email}/{@code @NotBlank} on
     * the DTO already reject a malformed address before this runs.
     */
    public static String domainOf(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        int at = trimmed.lastIndexOf('@');
        if (at < 0 || at == trimmed.length() - 1) {
            return null;
        }
        return trimmed.substring(at + 1).toLowerCase();
    }

    /**
     * True when {@code emailDomain} is the institution's registered domain or
     * any subdomain of it. Both sides are lowercased defensively — callers
     * typically already lowercase via {@link #domainOf}, but {@code
     * institutionDomain} may come straight from the database.
     *
     * <p>The subdomain check is a strict "ends with '.' + domain". This is
     * exactly what rejects a lookalike suffix like
     * "knust.edu.gh.evil.com" against the registered domain "knust.edu.gh":
     * that string ends with ".edu.gh.evil.com", not ".knust.edu.gh", and
     * isn't equal to it either. It also can't be fooled by a concatenated
     * label like "stknust.edu.gh" — that string doesn't end with
     * ".knust.edu.gh" (it ends with "tknust.edu.gh").
     */
    public static boolean matches(String emailDomain, String institutionDomain) {
        if (emailDomain == null || institutionDomain == null) {
            return false;
        }
        String candidate = emailDomain.toLowerCase();
        String registered = institutionDomain.toLowerCase();
        return candidate.equals(registered) || candidate.endsWith("." + registered);
    }
}
