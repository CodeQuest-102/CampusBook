package com.campusbook.campusbook.repository;

import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.staffOrStudentId = :staffOrStudentId")
    Optional<User> findByStaffOrStudentId(@Param("staffOrStudentId") String staffOrStudentId);

    boolean existsByEmail(String email);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.staffOrStudentId = :staffOrStudentId")
    boolean existsByStaffOrStudentId(@Param("staffOrStudentId") String staffOrStudentId);

    @Query("SELECT u FROM User u WHERE u.institution.id = :institutionId AND u.role = :role")
    List<User> findByInstitutionIdAndRole(@Param("institutionId") Long institutionId, @Param("role") Role role);

    List<User> findByInstitutionId(Long institutionId);

    long countByInstitutionId(Long institutionId);
}