package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.CreatePlatformInstitutionRequest;
import com.campusbook.campusbook.dto.InstitutionSummaryResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.enums.SubscriptionTier;
import com.campusbook.campusbook.exception.DuplicateUserException;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlatformAdminServiceTest {

    @Mock InstitutionRepository institutionRepository;
    @Mock UserRepository userRepository;
    @Mock HallRepository hallRepository;
    @Mock BookingRepository bookingRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserService userService;
    @InjectMocks PlatformAdminService platformAdminService;

    private Institution institution(long id, String name, String domain, boolean internal) {
        Institution i = new Institution();
        i.setId(id);
        i.setName(name);
        i.setEmailDomain(domain);
        i.setTier(SubscriptionTier.FREE);
        i.setInternal(internal);
        return i;
    }

    private CreatePlatformInstitutionRequest request() {
        CreatePlatformInstitutionRequest r = new CreatePlatformInstitutionRequest();
        r.setInstitutionName("Legon");
        r.setEmailDomain("ug.edu.gh");
        r.setTier(SubscriptionTier.FREE);
        r.setAdminFullName("New Admin");
        r.setAdminEmail("admin@ug.edu.gh");
        r.setAdminStaffOrStudentId("LEGON001");
        r.setAdminPassword("password1");
        return r;
    }

    /* ----------------------------- createInstitution ----------------------------- */

    @Test
    void createInstitution_savesTheInstitutionAndItsFirstAdmin() {
        CreatePlatformInstitutionRequest request = request();
        when(institutionRepository.existsByName("Legon")).thenReturn(false);
        when(institutionRepository.existsByEmailDomain("ug.edu.gh")).thenReturn(false);
        when(institutionRepository.save(any(Institution.class))).thenAnswer(i -> {
            Institution saved = i.getArgument(0);
            saved.setId(9L);
            return saved;
        });
        when(passwordEncoder.encode("password1")).thenReturn("encoded");
        when(hallRepository.countByInstitutionId(9L)).thenReturn(0L);
        when(bookingRepository.countByHallInstitutionId(9L)).thenReturn(0L);
        when(userRepository.countByInstitutionId(9L)).thenReturn(1L);

        InstitutionSummaryResponse summary = platformAdminService.createInstitution(request);

        assertThat(summary.id()).isEqualTo(9L);
        assertThat(summary.name()).isEqualTo("Legon");
        assertThat(summary.emailDomain()).isEqualTo("ug.edu.gh");
        assertThat(summary.userCount()).isEqualTo(1L);
        verify(userService).assertNotAlreadyRegistered("admin@ug.edu.gh", "LEGON001");
    }

    @Test
    void createInstitution_rejectsADuplicateInstitutionName() {
        when(institutionRepository.existsByName("Legon")).thenReturn(true);

        assertThatThrownBy(() -> platformAdminService.createInstitution(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Legon");

        verify(institutionRepository, never()).save(any());
    }

    @Test
    void createInstitution_rejectsADuplicateEmailDomain() {
        when(institutionRepository.existsByName(anyString())).thenReturn(false);
        when(institutionRepository.existsByEmailDomain("ug.edu.gh")).thenReturn(true);

        assertThatThrownBy(() -> platformAdminService.createInstitution(request()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ug.edu.gh");

        verify(institutionRepository, never()).save(any());
    }

    /**
     * The first admin's own email must actually belong to the institution
     * being created — otherwise a platform admin could register "Legon" with
     * domain ug.edu.gh but hand the keys to someone at a gmail.com address.
     */
    @Test
    void createInstitution_rejectsWhenTheAdminEmailDoesNotMatchTheInstitutionDomain() {
        CreatePlatformInstitutionRequest request = request();
        request.setAdminEmail("admin@gmail.com");
        when(institutionRepository.existsByName(anyString())).thenReturn(false);
        when(institutionRepository.existsByEmailDomain(anyString())).thenReturn(false);

        assertThatThrownBy(() -> platformAdminService.createInstitution(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ug.edu.gh");

        verify(institutionRepository, never()).save(any());
    }

    @Test
    void createInstitution_propagatesADuplicateAdminIdentity() {
        CreatePlatformInstitutionRequest request = request();
        when(institutionRepository.existsByName(anyString())).thenReturn(false);
        when(institutionRepository.existsByEmailDomain(anyString())).thenReturn(false);
        doThrow(new DuplicateUserException("Email already registered"))
                .when(userService).assertNotAlreadyRegistered("admin@ug.edu.gh", "LEGON001");

        assertThatThrownBy(() -> platformAdminService.createInstitution(request))
                .isInstanceOf(DuplicateUserException.class);

        verify(institutionRepository, never()).save(any());
    }

    /* ----------------------------- listInstitutions ------------------------------ */

    @Test
    void listInstitutions_excludesTheInternalInstitution() {
        Institution knust = institution(1L, "KNUST", "knust.edu.gh", false);
        Institution internal = institution(2L, "CampusBook Internal", "campusbook.internal", true);
        when(institutionRepository.findAll()).thenReturn(List.of(knust, internal));
        when(hallRepository.countByInstitutionId(1L)).thenReturn(5L);
        when(bookingRepository.countByHallInstitutionId(1L)).thenReturn(12L);
        when(userRepository.countByInstitutionId(1L)).thenReturn(3L);

        List<InstitutionSummaryResponse> result = platformAdminService.listInstitutions();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("KNUST");
        assertThat(result.get(0).hallCount()).isEqualTo(5L);
        assertThat(result.get(0).bookingCount()).isEqualTo(12L);
        assertThat(result.get(0).userCount()).isEqualTo(3L);
        verify(hallRepository, never()).countByInstitutionId(2L);
    }

    @Test
    void listInstitutions_returnsEmptyWhenOnlyTheInternalInstitutionExists() {
        when(institutionRepository.findAll())
                .thenReturn(List.of(institution(1L, "CampusBook Internal", "campusbook.internal", true)));

        assertThat(platformAdminService.listInstitutions()).isEmpty();
    }
}
