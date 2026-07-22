package com.campusbook.campusbook.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A one-time password-reset code. Only {@link #tokenHash} (a hash of the OTP) is
 * persisted — the plaintext code is emailed and never stored — so a database leak
 * can't be turned into an account takeover. A token is valid only while it is
 * unconsumed, unexpired, and under the attempt cap.
 */
@Entity
@Table(name = "password_reset_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Set when the code is successfully used; a consumed token can't be reused. */
    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    /** Wrong-code attempts against this token; the token hard-fails past a cap. */
    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
