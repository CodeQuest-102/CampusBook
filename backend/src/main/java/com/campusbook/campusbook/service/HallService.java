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

    /** Optional filters for {@link #searchHalls}; any null field is ignored. */
    public record HallFilters(String q,
                              Integer minCapacity,
                              Boolean projector,
                              Boolean ac,
                              Boolean microphone,
                              LocalDateTime freeFrom,
                              LocalDateTime freeUntil) {}

    /**
     * Active halls at the caller's institution narrowed by {@code filters}.
     * Filtering happens in the database rather than over a fully-loaded list, so
     * it stays correct as the room count grows.
     */
    public List<Hall> searchHalls(User actor, HallFilters filters) {
        validateFreeWindow(filters.freeFrom(), filters.freeUntil());

        // Neutral sentinels for "no filter" — see HallRepository.search for why the
        // query can't take nulls here.
        String pattern = (filters.q() == null || filters.q().isBlank())
                ? "%"
                : "%" + filters.q().trim().toLowerCase() + "%";
        int minCapacity = filters.minCapacity() == null ? 0 : Math.max(0, filters.minCapacity());

        return hallRepository.search(
                actor.getInstitution().getId(),
                pattern,
                minCapacity,
                Boolean.TRUE.equals(filters.projector()),
                Boolean.TRUE.equals(filters.ac()),
                Boolean.TRUE.equals(filters.microphone()),
                filters.freeFrom() != null,
                filters.freeFrom(),
                filters.freeUntil());
    }

    /**
     * The availability window is meaningless half-supplied — one bound without the
     * other would silently ignore the filter, so it's rejected instead.
     */
    private void validateFreeWindow(LocalDateTime freeFrom, LocalDateTime freeUntil) {
        if ((freeFrom == null) != (freeUntil == null)) {
            throw new IllegalStateException(
                    "Supply both freeFrom and freeUntil to filter by availability, or neither");
        }
        if (freeFrom != null && !freeFrom.isBefore(freeUntil)) {
            throw new IllegalStateException("freeFrom must be before freeUntil");
        }
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
