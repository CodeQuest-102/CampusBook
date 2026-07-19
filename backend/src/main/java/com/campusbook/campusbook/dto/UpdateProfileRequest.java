package com.campusbook.campusbook.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    // Both optional — only non-null fields are applied.
    private String fullName;
    private String department;
}
