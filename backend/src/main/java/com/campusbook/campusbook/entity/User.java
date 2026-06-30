package com.campusbook.campusbook.entity;

import com.campusbook.campusbook.enums.Role;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    @Column(unique = true)
    private String email;

    @NotBlank
    @Column(unique = true, name = "staff_or_student_id")
    private String staffOrStudentId;

    @NotBlank
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String department;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}