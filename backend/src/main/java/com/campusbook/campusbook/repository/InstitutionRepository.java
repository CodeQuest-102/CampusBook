package com.campusbook.campusbook.repository;
import com.campusbook.campusbook.entity.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstitutionRepository extends JpaRepository<Institution, Long> {
    boolean existsByEmailDomain(String emailDomain);
    boolean existsByName(String name);
}