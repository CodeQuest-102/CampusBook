package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.campusbook.campusbook.dto.HallAvailabilityResponse;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.repository.BookingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

import java.util.List;

/**
 * All reads and writes are scoped to the acting user's institution. A hall
 * belongs to exactly one campus, and an admin at campus A must never see or
 * mutate campus B's rooms — that isolation is what makes the multi-campus
 * (Enterprise) model meaningful and is enforced here rather than trusted to
 * the caller.
 */
@Service
public class HallService {

    @Autowired
    private HallRepository hallRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private SubscriptionCatalog subscriptionCatalog;

    public Hall createHall(Hall hall, User admin) {
        Long institutionId = admin.getInstitution().getId();
        hallRepository.findByInstitutionIdAndRoomCode(institutionId, hall.getRoomCode())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Room code already exists");
                });

        hall.setInstitution(admin.getInstitution());
        enforceHallLimit(admin.getInstitution());

        return hallRepository.save(hall);
    }

    /** Every hall (active or not) for the acting admin's institution. */
    public List<Hall> getAllHalls(User actor) {
        return hallRepository.findByInstitutionId(actor.getInstitution().getId());
    }

    /** Active, bookable halls for the acting user's institution. */
    public List<Hall> getActiveHalls(User actor) {
        return hallRepository.findByInstitutionIdAndActiveTrue(actor.getInstitution().getId());
    }

    /** Raw lookup with no scoping — internal callers only. */
    public Hall getHallById(Long id) {
        return hallRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hall not found"));
    }

    /** Lookup that rejects a hall belonging to another institution with a 403. */
    public Hall getHallForUser(Long id, User actor) {
        Hall hall = getHallById(id);
        assertSameInstitution(hall, actor);
        return hall;
    }

    public HallAvailabilityResponse getAvailability(Long hallId, LocalDate date, User actor) {
        // confirms the hall exists and belongs to the caller's institution
        getHallForUser(hallId, actor);

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        List<Booking> bookings = bookingRepository.findApprovedBookingsForHallOnDate(hallId, dayStart, dayEnd);

        List<HallAvailabilityResponse.OccupiedSlot> occupiedSlots = bookings.stream()
                .map(b -> new HallAvailabilityResponse.OccupiedSlot(
                        b.getStartTime(),
                        b.getEndTime(),
                        b.getUser().getFullName()
                ))
                .collect(Collectors.toList());

        return new HallAvailabilityResponse(hallId, date, occupiedSlots);
    }

    public Hall updateHall(Long id, Hall updatedHall, User actor) {
        Hall hall = getHallById(id);
        assertSameInstitution(hall, actor);

        hallRepository.findByInstitutionIdAndRoomCode(actor.getInstitution().getId(), updatedHall.getRoomCode())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Room code already exists");
                    }
                });
        hall.setBlock(updatedHall.getBlock());
        hall.setRoomCode(updatedHall.getRoomCode());
        hall.setCapacity(updatedHall.getCapacity());
        hall.setHasProjector(updatedHall.isHasProjector());
        hall.setHasAC(updatedHall.isHasAC());
        hall.setHasMicrophone(updatedHall.isHasMicrophone());
        hall.setActive(updatedHall.isActive());
        return hallRepository.save(hall);
    }

    public Hall disableHall(Long id, User actor) {
        Hall hall = getHallById(id);
        assertSameInstitution(hall, actor);
        hall.setActive(false);
        return hallRepository.save(hall);
    }

    private void assertSameInstitution(Hall hall, User actor) {
        if (!hall.getInstitution().getId().equals(actor.getInstitution().getId())) {
            throw new SecurityException("This room belongs to another institution");
        }
    }

    private void enforceHallLimit(Institution institution) {
        Integer limit = subscriptionCatalog.forTier(institution.getTier()).activeHallLimit();
        if (limit == null) return; // unlimited tier

        long activeCount = hallRepository.countByInstitutionIdAndActiveTrue(institution.getId());
        if (activeCount >= limit) {
            throw new SubscriptionLimitExceededException(
                    "Your plan allows a maximum of " + limit + " active rooms. Upgrade to Campus Pro for unlimited rooms."
            );
        }
    }
}
