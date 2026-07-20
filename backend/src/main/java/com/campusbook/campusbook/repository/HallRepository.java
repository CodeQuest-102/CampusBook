package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.Hall;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface HallRepository extends JpaRepository<Hall, Long> {

    Optional<Hall> findByRoomCode(String roomCode);

    List<Hall> findByActiveTrue();

    long countByInstitutionIdAndActiveTrue(Long institutionId);
}