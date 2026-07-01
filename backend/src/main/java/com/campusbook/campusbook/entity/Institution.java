package com.campusbook.campusbook.entity;

import com.campusbook.campusbook.enums.SubscriptionTier;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "institutions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionTier tier = SubscriptionTier.FREE;

    // Stub feature flags for future tiers — not enforced yet
    private boolean analyticsEnabled = false;
    private boolean customNotificationsEnabled = false;
    private boolean apiIntegrationsEnabled = false;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}