package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.CreatePlatformInstitutionRequest;
import com.campusbook.campusbook.dto.InstitutionSummaryResponse;
import com.campusbook.campusbook.service.PlatformAdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform-admin only: onboarding new institutions and monitoring every
 * institution in the system. Deliberately separate from every other
 * controller — institution-scoped endpoints never route through here, and
 * this never routes through {@code assertSameInstitution}.
 */
@RestController
@RequestMapping("/api/platform")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformAdminController {

    @Autowired
    private PlatformAdminService platformAdminService;

    @PostMapping("/institutions")
    public ResponseEntity<InstitutionSummaryResponse> createInstitution(
            @Valid @RequestBody CreatePlatformInstitutionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(platformAdminService.createInstitution(request));
    }

    @GetMapping("/institutions")
    public ResponseEntity<List<InstitutionSummaryResponse>> listInstitutions() {
        return ResponseEntity.ok(platformAdminService.listInstitutions());
    }
}
