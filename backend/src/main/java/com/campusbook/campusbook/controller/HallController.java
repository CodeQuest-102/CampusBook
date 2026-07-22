package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.dto.HallRequest;
import com.campusbook.campusbook.dto.HallResponse;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.service.HallService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.campusbook.campusbook.dto.HallAvailabilityResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/halls")
public class HallController {

    @Autowired
    private HallService hallService;

    /**
     * Active halls at the caller's institution. All filters are optional; supply
     * {@code freeFrom} and {@code freeUntil} together to keep only rooms with no
     * approved booking overlapping that window.
     */
    @GetMapping
    public ResponseEntity<List<HallResponse>> listActiveHalls(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Boolean projector,
            @RequestParam(required = false) Boolean ac,
            @RequestParam(required = false) Boolean microphone,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime freeFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime freeUntil) {

        HallService.HallFilters filters = new HallService.HallFilters(
                q, minCapacity, projector, ac, microphone, freeFrom, freeUntil);

        List<HallResponse> halls = hallService.searchHalls(user, filters).stream()
                .map(HallResponse::from)
                .toList();
        return ResponseEntity.ok(halls);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<List<HallResponse>> listAllHalls(@AuthenticationPrincipal User user) {
        List<HallResponse> halls = hallService.getAllHalls(user).stream()
                .map(HallResponse::from)
                .toList();
        return ResponseEntity.ok(halls);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HallResponse> getHall(@AuthenticationPrincipal User user,
                                                @PathVariable Long id) {
        return ResponseEntity.ok(HallResponse.from(hallService.getHallForUser(id, user)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<HallResponse> createHall(@AuthenticationPrincipal User user,
                                                    @Valid @RequestBody HallRequest request) {
        Hall hall = toHall(request);
        return ResponseEntity.ok(HallResponse.from(hallService.createHall(hall, user)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<HallResponse> updateHall(@AuthenticationPrincipal User user,
                                                    @PathVariable Long id,
                                                    @Valid @RequestBody HallRequest request) {
        Hall hall = toHall(request);
        return ResponseEntity.ok(HallResponse.from(hallService.updateHall(id, hall, user)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<HallResponse> disableHall(@AuthenticationPrincipal User user,
                                                     @PathVariable Long id) {
        return ResponseEntity.ok(HallResponse.from(hallService.disableHall(id, user)));
    }

    private Hall toHall(HallRequest request) {
        Hall hall = new Hall();
        hall.setBlock(request.getBlock());
        hall.setRoomCode(request.getRoomCode());
        hall.setCapacity(request.getCapacity());
        hall.setHasProjector(request.isHasProjector());
        hall.setHasAC(request.isHasAC());
        hall.setHasMicrophone(request.isHasMicrophone());
        hall.setActive(request.isActive());
        return hall;
        
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<HallAvailabilityResponse> getHallAvailability(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(hallService.getAvailability(id, date, user));
    }
}