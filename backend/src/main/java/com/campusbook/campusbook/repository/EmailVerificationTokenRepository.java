package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    /**
     * The most recent token for a user that is still usable — unconsumed and
     * unexpired. Verification only ever considers this one; older codes for the
     * same user are invalidated when a new one is issued.
     */
    @Query("""
        SELECT t FROM EmailVerificationToken t
        WHERE t.user.id = :userId
          AND t.consumedAt IS NULL
          AND t.expiresAt > :now
        ORDER BY t.createdAt DESC
        LIMIT 1
    """)
    Optional<EmailVerificationToken> findActiveForUser(@Param("userId") Long userId,
                                                        @Param("now") LocalDateTime now);

    /**
     * Invalidate every outstanding (unconsumed) token for a user by marking it
     * consumed. Called before issuing a fresh code so only one code is ever live.
     */
    @Modifying
    @Query("UPDATE EmailVerificationToken t SET t.consumedAt = :now WHERE t.user.id = :userId AND t.consumedAt IS NULL")
    void invalidateAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
