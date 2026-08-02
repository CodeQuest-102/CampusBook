package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.AdminCreateUserRequest;
import com.campusbook.campusbook.dto.UpdateProfileRequest;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.exception.DuplicateUserException;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock InstitutionRepository institutionRepository;
    @InjectMocks UserService userService;

    private Institution institution(long id) {
        Institution i = new Institution();
        i.setId(id);
        i.setName("KNUST");
        return i;
    }

    private User user(long id, Institution institution) {
        User u = new User();
        u.setId(id);
        u.setFullName("Test User");
        u.setEmail("user" + id + "@knust.edu.gh");
        u.setStaffOrStudentId("2055" + id);
        u.setRole(Role.STUDENT_LEADER);
        u.setInstitution(institution);
        return u;
    }

    /* ----------------------------- registerUser ---------------------------- */

    @Test
    void registerUser_assignsTheFirstInstitutionAndEncodesThePassword() {
        User toRegister = new User();
        toRegister.setEmail("new@knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        toRegister.setPassword("plaintext");
        Institution firstInstitution = institution(1L);

        when(userRepository.existsByEmail("new@knust.edu.gh")).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId("20551234")).thenReturn(false);
        when(institutionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(firstInstitution));
        when(passwordEncoder.encode("plaintext")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.registerUser(toRegister);

        assertThat(saved.getInstitution()).isEqualTo(firstInstitution);
        assertThat(saved.getPassword()).isEqualTo("encoded");
    }

    @Test
    void registerUser_rejectsDuplicateEmail() {
        User toRegister = new User();
        toRegister.setEmail("dupe@knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        when(userRepository.existsByEmail("dupe@knust.edu.gh")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerUser(toRegister))
                .isInstanceOf(DuplicateUserException.class)
                .hasMessageContaining("Email already registered");

        verify(userRepository, never()).save(any());
        verify(institutionRepository, never()).findFirstByOrderByIdAsc();
    }

    @Test
    void registerUser_rejectsDuplicateStaffOrStudentId() {
        User toRegister = new User();
        toRegister.setEmail("new@knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        when(userRepository.existsByEmail("new@knust.edu.gh")).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId("20551234")).thenReturn(true);

        assertThatThrownBy(() -> userService.registerUser(toRegister))
                .isInstanceOf(DuplicateUserException.class)
                .hasMessageContaining("Staff/Student ID already registered");

        verify(userRepository, never()).save(any());
    }

    /**
     * Public self-registration has no institution field on the request at all
     * — it always lands on whichever institution sorts first. Worth having
     * this documented as a test: it's a real limitation (only one campus can
     * ever get self-service signups), not something a future refactor should
     * silently paper over without noticing the behavior changed.
     */
    @Test
    void registerUser_throwsWhenNoInstitutionIsConfigured() {
        User toRegister = new User();
        toRegister.setEmail("new@knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(institutionRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.registerUser(toRegister))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No institution configured");

        verify(userRepository, never()).save(any());
    }

    /* ----------------------------- createByAdmin ---------------------------- */

    private AdminCreateUserRequest adminRequest() {
        AdminCreateUserRequest r = new AdminCreateUserRequest();
        r.setFullName("  Ama Mensah  ");
        r.setEmail("  ama.mensah@knust.edu.gh  ");
        r.setStaffOrStudentId("  20551234  ");
        r.setPassword("plaintext");
        r.setRole(Role.STUDENT_LEADER);
        r.setDepartment("  Computer Science  ");
        return r;
    }

    /**
     * Unlike self-registration, an admin-created user is scoped to the
     * *acting admin's* institution — this is what keeps multi-campus
     * isolation intact on the write side, per the class-level Javadoc.
     */
    @Test
    void createByAdmin_scopesTheNewUserToTheAdminsInstitution() {
        Institution adminInstitution = institution(7L);
        User admin = user(1L, adminInstitution);
        AdminCreateUserRequest request = adminRequest();

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(passwordEncoder.encode("plaintext")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.createByAdmin(request, admin);

        assertThat(saved.getInstitution()).isEqualTo(adminInstitution);
        assertThat(saved.getPassword()).isEqualTo("encoded");
        // Scoped from the admin, not the global "first institution" lookup.
        verify(institutionRepository, never()).findFirstByOrderByIdAsc();
    }

    @Test
    void createByAdmin_trimsFreeTextFields() {
        User admin = user(1L, institution(7L));
        AdminCreateUserRequest request = adminRequest();
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.createByAdmin(request, admin);

        assertThat(saved.getFullName()).isEqualTo("Ama Mensah");
        assertThat(saved.getEmail()).isEqualTo("ama.mensah@knust.edu.gh");
        assertThat(saved.getStaffOrStudentId()).isEqualTo("20551234");
        assertThat(saved.getDepartment()).isEqualTo("Computer Science");
    }

    @Test
    void createByAdmin_allowsANullDepartment() {
        User admin = user(1L, institution(7L));
        AdminCreateUserRequest request = adminRequest();
        request.setDepartment(null);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.createByAdmin(request, admin);

        assertThat(saved.getDepartment()).isNull();
    }

    @Test
    void createByAdmin_rejectsDuplicateEmail() {
        User admin = user(1L, institution(7L));
        AdminCreateUserRequest request = adminRequest();
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> userService.createByAdmin(request, admin))
                .isInstanceOf(DuplicateUserException.class);

        verify(userRepository, never()).save(any());
    }

    /* ------------------------- findByEmailOrStaffId ------------------------- */

    @Test
    void findByEmailOrStaffId_findsByEmailFirst() {
        User match = user(1L, institution(1L));
        when(userRepository.findByEmail("user1@knust.edu.gh")).thenReturn(Optional.of(match));

        User found = userService.findByEmailOrStaffId("user1@knust.edu.gh");

        assertThat(found).isEqualTo(match);
        verify(userRepository, never()).findByStaffOrStudentId(anyString());
    }

    @Test
    void findByEmailOrStaffId_fallsBackToStaffOrStudentId() {
        User match = user(1L, institution(1L));
        when(userRepository.findByEmail("20551234")).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId("20551234")).thenReturn(Optional.of(match));

        User found = userService.findByEmailOrStaffId("20551234");

        assertThat(found).isEqualTo(match);
    }

    @Test
    void findByEmailOrStaffId_throwsInvalidCredentialsWhenNeitherMatches() {
        when(userRepository.findByEmail("nobody")).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findByEmailOrStaffId("nobody"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    /* --------------------------- getUsersForInstitution ---------------------------- */

    @Test
    void getUsersForInstitution_delegatesToRepository() {
        List<User> expected = List.of(user(1L, institution(1L)));
        when(userRepository.findByInstitutionId(1L)).thenReturn(expected);

        assertThat(userService.getUsersForInstitution(1L)).isEqualTo(expected);
    }

    /* ------------------------------ updateProfile --------------------------- */

    @Test
    void updateProfile_updatesFullNameAndDepartmentWhenProvided() {
        User existing = user(1L, institution(1L));
        UpdateProfileRequest patch = new UpdateProfileRequest();
        patch.setFullName("  New Name  ");
        patch.setDepartment("  New Dept  ");
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.updateProfile(1L, patch);

        assertThat(saved.getFullName()).isEqualTo("New Name");
        assertThat(saved.getDepartment()).isEqualTo("New Dept");
    }

    @Test
    void updateProfile_ignoresABlankFullName() {
        User existing = user(1L, institution(1L));
        existing.setFullName("Original Name");
        UpdateProfileRequest patch = new UpdateProfileRequest();
        patch.setFullName("   ");
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.updateProfile(1L, patch);

        assertThat(saved.getFullName()).isEqualTo("Original Name");
    }

    /**
     * Asymmetric with full name on purpose in the current code: department
     * only guards against null, not blank, so it can be cleared to "" while
     * full name cannot be blanked out. Pinning this down so a future change
     * to one doesn't silently change the other's behavior too.
     */
    @Test
    void updateProfile_allowsClearingDepartmentToBlank() {
        User existing = user(1L, institution(1L));
        existing.setDepartment("Computer Science");
        UpdateProfileRequest patch = new UpdateProfileRequest();
        patch.setDepartment("   ");
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.updateProfile(1L, patch);

        assertThat(saved.getDepartment()).isBlank();
    }

    @Test
    void updateProfile_leavesFieldsUntouchedWhenPatchFieldsAreNull() {
        User existing = user(1L, institution(1L));
        existing.setFullName("Original Name");
        existing.setDepartment("Original Dept");
        UpdateProfileRequest patch = new UpdateProfileRequest(); // both null
        when(userRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.updateProfile(1L, patch);

        assertThat(saved.getFullName()).isEqualTo("Original Name");
        assertThat(saved.getDepartment()).isEqualTo("Original Dept");
    }

    @Test
    void updateProfile_throwsNotFoundWhenTheUserDoesNotExist() {
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile(404L, new UpdateProfileRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found");
    }
}
