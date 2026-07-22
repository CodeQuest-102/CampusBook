package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.repository.HallRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HallServiceTest {

    @Mock HallRepository hallRepository;
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
}
