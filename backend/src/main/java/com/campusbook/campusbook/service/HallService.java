package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.HallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.campusbook.campusbook.dto.HallAvailabilityResponse;
import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.repository.BookingRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

import java.util.List;

@Service
public class HallService {

    private static final int FREE_TIER_HALL_LIMIT = 5;

    @Autowired
    private HallRepository hallRepository;
    @Autowired
    private BookingRepository bookingRepository;

    public Hall createHall(Hall hall, User admin) {
        hallRepository.findByRoomCode(hall.getRoomCode()).ifPresent(existing -> {
            throw new IllegalArgumentException("Room code already exists");
        });

        hall.setInstitution(admin.getInstitution());
        enforceHallLimit(admin.getInstitution());

        return hallRepository.save(hall);
    }

    public List<Hall> getAllHalls() {
        return hallRepository.findAll();
    }

    public List<Hall> getAllActiveHalls() {
        return hallRepository.findByActiveTrue();
    }

    public Hall getHallById(Long id) {
        return hallRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hall not found"));
    }

    public HallAvailabilityResponse getAvailability(Long hallId, LocalDate date) {
    // confirms the hall exists — reuses your existing not-found handling
    getHallById(hallId);

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

    public Hall getHallByRoomCode(String roomCode) {
        return hallRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("Hall not found: " + roomCode));
    }

    public Hall updateHall(Long id, Hall updatedHall) {
        Hall hall = getHallById(id);
        hallRepository.findByRoomCode(updatedHall.getRoomCode()).ifPresent(existing -> {
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

    public Hall disableHall(Long id) {
        Hall hall = getHallById(id);
        hall.setActive(false);
        return hallRepository.save(hall);
    }

    private void enforceHallLimit(com.campusbook.campusbook.entity.Institution institution) {
        if (institution.getTier() == SubscriptionTier.FREE) {
            long activeCount = hallRepository.countByInstitutionIdAndActiveTrue(institution.getId());
            if (activeCount >= FREE_TIER_HALL_LIMIT) {
                throw new SubscriptionLimitExceededException(
                        "Free tier allows a maximum of " + FREE_TIER_HALL_LIMIT + " active halls. Upgrade to Campus Pro for unlimited halls."
                );
            }
        }
    }
}