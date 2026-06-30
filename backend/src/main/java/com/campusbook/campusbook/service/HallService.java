package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.repository.HallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HallService {

    @Autowired
    private HallRepository hallRepository;

    public Hall createHall(Hall hall) {
        hallRepository.findByRoomCode(hall.getRoomCode()).ifPresent(existing -> {
            throw new IllegalArgumentException("Room code already exists");
        });
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
}
