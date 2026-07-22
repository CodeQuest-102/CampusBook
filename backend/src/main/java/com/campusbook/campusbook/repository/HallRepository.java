package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.Hall;
import org.springframework.data.jpa.repository.JpaRepository;
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
}