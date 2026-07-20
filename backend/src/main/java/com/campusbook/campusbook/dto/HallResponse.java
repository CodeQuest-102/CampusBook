package com.campusbook.campusbook.dto;

import com.campusbook.campusbook.entity.Hall;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HallResponse {

    private Long id;
    private String block;
    private String roomCode;
    private Integer capacity;
    private boolean hasProjector;
    private boolean hasAC;
    private boolean hasMicrophone;
    private boolean active;

    public static HallResponse from(Hall hall) {
        return new HallResponse(
                hall.getId(),
                hall.getBlock(),
                hall.getRoomCode(),
                hall.getCapacity(),
                hall.isHasProjector(),
                hall.isHasAC(),
                hall.isHasMicrophone(),
                hall.isActive()
        );
    }
}
