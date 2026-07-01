package com.campusbook.campusbook.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "halls")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Hall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String block;          // e.g. "Science Complex Block"

    @NotBlank
    @Column(unique = true, name = "room_code")
    private String roomCode;       // e.g. "GF1", "SF1" — what's on the door

    @ManyToOne
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    private Integer capacity;

    private boolean hasProjector;
    private boolean hasAC;
    private boolean hasMicrophone;

    private boolean active = true; // for soft-disabling a hall instead of deleting
}
