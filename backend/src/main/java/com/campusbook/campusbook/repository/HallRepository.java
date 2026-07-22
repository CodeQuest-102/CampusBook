package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.Hall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

public interface HallRepository extends JpaRepository<Hall, Long> {

    Optional<Hall> findByRoomCode(String roomCode);

    List<Hall> findByActiveTrue();

    long countByInstitutionIdAndActiveTrue(Long institutionId);

    long countByInstitutionId(Long institutionId);

    /* ---- institution-scoped finders (multi-campus isolation) ---- */

    List<Hall> findByInstitutionId(Long institutionId);

    List<Hall> findByInstitutionIdAndActiveTrue(Long institutionId);

    // Room codes are unique per institution, not globally — the same "GF1" can
    // exist on two campuses.
    Optional<Hall> findByInstitutionIdAndRoomCode(Long institutionId, String roomCode);

    /**
     * Active halls at one institution, narrowed by an optional set of filters.
     *
     * <p>Every parameter is deliberately non-null, using a neutral sentinel to mean
     * "don't filter": {@code pattern} is {@code "%"}, {@code minCapacity} is 0, and
     * the equipment/window flags are {@code false}. PostgreSQL cannot infer the type
     * of a bare {@code ? IS NULL} parameter (SQLSTATE 42P18), so the usual
     * nullable-parameter idiom fails here; sentinels sidestep it entirely. The only
     * nullable parameters are the two timestamps, which appear solely in comparisons
     * against timestamp columns where the type is inferable.
     *
     * <p>Equipment filters are "require" flags — a caller asks for rooms that
     * <em>have</em> a projector, never for rooms that lack one.
     *
     * <p>{@code freeFrom}/{@code freeUntil} exclude halls with an APPROVED booking
     * overlapping that window, reusing the overlap predicate from conflict
     * detection ({@code start < until AND end > from}).
     */
    @Query("""
        SELECT h FROM Hall h
        WHERE h.institution.id = :institutionId
          AND h.active = true
          AND (LOWER(h.block) LIKE :pattern OR LOWER(h.roomCode) LIKE :pattern)
          AND (:minCapacity = 0 OR (h.capacity IS NOT NULL AND h.capacity >= :minCapacity))
          AND (:requireProjector = FALSE OR h.hasProjector = TRUE)
          AND (:requireAc = FALSE OR h.hasAC = TRUE)
          AND (:requireMicrophone = FALSE OR h.hasMicrophone = TRUE)
          AND (:filterByWindow = FALSE OR NOT EXISTS (
                SELECT b FROM Booking b
                WHERE b.hall.id = h.id
                  AND b.status = 'APPROVED'
                  AND b.startTime < :freeUntil
                  AND b.endTime > :freeFrom))
        ORDER BY h.block ASC, h.roomCode ASC
    """)
    List<Hall> search(@Param("institutionId") Long institutionId,
                      @Param("pattern") String pattern,
                      @Param("minCapacity") int minCapacity,
                      @Param("requireProjector") boolean requireProjector,
                      @Param("requireAc") boolean requireAc,
                      @Param("requireMicrophone") boolean requireMicrophone,
                      @Param("filterByWindow") boolean filterByWindow,
                      @Param("freeFrom") LocalDateTime freeFrom,
                      @Param("freeUntil") LocalDateTime freeUntil);
}