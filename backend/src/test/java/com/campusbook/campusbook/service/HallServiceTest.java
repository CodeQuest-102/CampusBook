package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Booking;
import com.campusbook.campusbook.entity.Hall;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.SubscriptionLimitExceededException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.subscription.SubscriptionCatalog;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HallServiceTest {

    @Mock HallRepository hallRepository;
    @Mock BookingRepository bookingRepository;
    @InjectMocks HallService hallService;

    private User actor() {
        Institution i = new Institution();
        i.setId(1L);
        User u = new User();
        u.setId(5L);
        u.setInstitution(i);
        return u;
    }

    private HallService.HallFilters filters(String q, Integer minCapacity, Boolean projector,
                                            LocalDateTime from, LocalDateTime until) {
        return new HallService.HallFilters(q, minCapacity, projector, null, null, from, until);
    }

    @Test
    void noFilters_passNeutralSentinels() {
        when(hallRepository.search(any(), any(), anyInt(), anyBoolean(), anyBoolean(), anyBoolean(),
                anyBoolean(), any(), any())).thenReturn(List.of());

        hallService.searchHalls(actor(), filters(null, null, null, null, null));

        // "%" matches everything, 0 disables the capacity filter, flags all false.
        verify(hallRepository).search(eq(1L), eq("%"), eq(0), eq(false), eq(false), eq(false),
                eq(false), isNull(), isNull());
    }

    @Test
    void textFilter_becomesLowercasedWildcardPattern() {
        when(hallRepository.search(any(), any(), anyInt(), anyBoolean(), anyBoolean(), anyBoolean(),
                anyBoolean(), any(), any())).thenReturn(List.of());

        hallService.searchHalls(actor(), filters("  GF ", null, null, null, null));

        verify(hallRepository).search(eq(1L), eq("%gf%"), eq(0), eq(false), eq(false), eq(false),
                eq(false), isNull(), isNull());
    }

    @Test
    void availabilityWindow_setsFlagAndBounds() {
        LocalDateTime from = LocalDateTime.of(2027, 3, 4, 10, 0);
        LocalDateTime until = LocalDateTime.of(2027, 3, 4, 12, 0);
        when(hallRepository.search(any(), any(), anyInt(), anyBoolean(), anyBoolean(), anyBoolean(),
                anyBoolean(), any(), any())).thenReturn(List.of());

        hallService.searchHalls(actor(), filters(null, 100, true, from, until));

        verify(hallRepository).search(eq(1L), eq("%"), eq(100), eq(true), eq(false), eq(false),
                eq(true), eq(from), eq(until));
    }

    @Test
    void halfSuppliedWindow_isRejected() {
        LocalDateTime from = LocalDateTime.of(2027, 3, 4, 10, 0);

        assertThatThrownBy(() -> hallService.searchHalls(actor(), filters(null, null, null, from, null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("both freeFrom and freeUntil");

        verifyNoInteractions(hallRepository);
    }

    @Test
    void invertedWindow_isRejected() {
        LocalDateTime from = LocalDateTime.of(2027, 3, 4, 14, 0);
        LocalDateTime until = LocalDateTime.of(2027, 3, 4, 13, 0);

        assertThatThrownBy(() -> hallService.searchHalls(actor(), filters(null, null, null, from, until)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("before");
    }

    @Test
    void negativeCapacity_isClampedToNoFilter() {
        when(hallRepository.search(any(), any(), anyInt(), anyBoolean(), anyBoolean(), anyBoolean(),
                anyBoolean(), any(), any())).thenReturn(List.of());

        assertThatCode(() -> hallService.searchHalls(actor(), filters(null, -5, null, null, null)))
                .doesNotThrowAnyException();

        verify(hallRepository).search(eq(1L), eq("%"), eq(0), eq(false), eq(false), eq(false),
                eq(false), isNull(), isNull());
    }

    /* --------------------------- plan room cap ---------------------------- */

    private Hall newHall() {
        Hall h = new Hall();
        h.setBlock("Science Complex Block");
        h.setRoomCode("GF9");
        h.setCapacity(50);
        return h;
    }

    private void withRealCatalog() {
        ReflectionTestUtils.setField(hallService, "subscriptionCatalog", new SubscriptionCatalog());
    }

    /**
     * The escape this closes: park a room on maintenance, add a replacement,
     * then reactivate the parked one. Counting only active rooms made the Free
     * tier's cap of 5 unenforceable.
     */
    @Test
    void roomCap_countsMaintenanceRoomsToo() {
        withRealCatalog();
        User admin = actor(); // FREE tier, limit 5
        when(hallRepository.findByInstitutionIdAndRoomCode(1L, "GF9")).thenReturn(Optional.empty());
        // 4 active + 1 on maintenance = 5 on the books.
        when(hallRepository.countByInstitutionId(1L)).thenReturn(5L);

        assertThatThrownBy(() -> hallService.createHall(newHall(), admin))
                .isInstanceOf(SubscriptionLimitExceededException.class)
                .hasMessageContaining("including any on maintenance");

        verify(hallRepository, never()).save(any());
    }

    @Test
    void roomCap_allowsCreationBelowTheLimit() {
        withRealCatalog();
        User admin = actor();
        when(hallRepository.findByInstitutionIdAndRoomCode(1L, "GF9")).thenReturn(Optional.empty());
        when(hallRepository.countByInstitutionId(1L)).thenReturn(4L);
        when(hallRepository.save(any(Hall.class))).thenAnswer(i -> i.getArgument(0));

        assertThatCode(() -> hallService.createHall(newHall(), admin)).doesNotThrowAnyException();

        verify(hallRepository).save(any(Hall.class));
    }

    /* ----------------------------- deletion ------------------------------- */

    private Hall existingHall(User owner) {
        Hall h = newHall();
        h.setId(7L);
        h.setInstitution(owner.getInstitution());
        return h;
    }

    @Test
    void deleteHall_refusesARoomThatHasBookings() {
        User admin = actor();
        Hall hall = existingHall(admin);
        when(hallRepository.findById(7L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findByHallId(7L)).thenReturn(List.of(new Booking()));

        assertThatThrownBy(() -> hallService.deleteHall(7L, admin))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Maintenance");

        verify(hallRepository, never()).delete(any());
    }

    @Test
    void deleteHall_removesARoomWithNoHistory() {
        User admin = actor();
        Hall hall = existingHall(admin);
        when(hallRepository.findById(7L)).thenReturn(Optional.of(hall));
        when(bookingRepository.findByHallId(7L)).thenReturn(List.of());

        hallService.deleteHall(7L, admin);

        verify(hallRepository).delete(hall);
    }

    @Test
    void setHallActive_togglesWithoutTouchingAnythingElse() {
        User admin = actor();
        Hall hall = existingHall(admin);
        hall.setActive(false);
        when(hallRepository.findById(7L)).thenReturn(Optional.of(hall));
        when(hallRepository.save(any(Hall.class))).thenAnswer(i -> i.getArgument(0));

        Hall result = hallService.setHallActive(7L, true, admin);

        assertThat(result.isActive()).isTrue();
        assertThat(result.getRoomCode()).isEqualTo("GF9");
        assertThat(result.getCapacity()).isEqualTo(50);
    }
}
