package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * The most recent token for a user that is still usable — unconsumed and
     * unexpired. Verification only ever considers this one; older codes for the
     * same user are invalidated when a new one is issued.
     */
    @Query("""
        SELECT t FROM PasswordResetToken t
        WHERE t.user.id = :userId
          AND t.consumedAt IS NULL
          AND t.expiresAt > :now
        ORDER BY t.createdAt DESC
        LIMIT 1
    """)
    Optional<PasswordResetToken> findActiveForUser(@Param("userId") Long userId,
                                                   @Param("now") LocalDateTime now);

    /**
     * Invalidate every outstanding (unconsumed) token for a user by marking it
     * consumed. Called before issuing a fresh code so only one code is ever live.
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.consumedAt = :now WHERE t.user.id = :userId AND t.consumedAt IS NULL")
    void invalidateAllForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
