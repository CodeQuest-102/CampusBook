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
        i.setEmailDomain("knust.edu.gh");
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
    void registerUser_resolvesTheInstitutionMatchingTheEmailDomain() {
        User toRegister = new User();
        toRegister.setEmail("new@knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        toRegister.setPassword("plaintext");
        Institution knust = institution(1L);

        when(userRepository.existsByEmail("new@knust.edu.gh")).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId("20551234")).thenReturn(false);
        when(institutionRepository.findAll()).thenReturn(List.of(knust));
        when(passwordEncoder.encode("plaintext")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.registerUser(toRegister);

        assertThat(saved.getInstitution()).isEqualTo(knust);
        assertThat(saved.getPassword()).isEqualTo("encoded");
    }

    @Test
    void registerUser_acceptsAnySubdomainOfTheInstitutionsDomain() {
        User toRegister = new User();
        toRegister.setEmail("new@st.knust.edu.gh");
        toRegister.setStaffOrStudentId("20551234");
        toRegister.setPassword("plaintext");
        Institution knust = institution(1L);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(institutionRepository.findAll()).thenReturn(List.of(knust));
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        assertThat(userService.registerUser(toRegister).getInstitution()).isEqualTo(knust);
    }

    @Test
    void registerUser_rejectsALookalikeSuffixDomain() {
        User toRegister = new User();
        toRegister.setEmail("new@knust.edu.gh.evil.com");
        toRegister.setStaffOrStudentId("20551234");
        Institution knust = institution(1L);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(institutionRepository.findAll()).thenReturn(List.of(knust));

        assertThatThrownBy(() -> userService.registerUser(toRegister))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("knust.edu.gh.evil.com");

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerUser_rejectsAnUnrecognizedDomain() {
        User toRegister = new User();
        toRegister.setEmail("new@gmail.com");
        toRegister.setStaffOrStudentId("20551234");
        Institution knust = institution(1L);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(institutionRepository.findAll()).thenReturn(List.of(knust));

        assertThatThrownBy(() -> userService.registerUser(toRegister))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("gmail.com");

        verify(userRepository, never()).save(any());
    }

    /**
     * This is the bug being fixed: registration used to always land on
     * whichever institution sorted first by id, regardless of the
     * registering email. Here KNUST (id 1) sorts first but the email belongs
     * to Ridgeview (id 2) — a correct fix must resolve to Ridgeview, not
     * silently fall back to KNUST.
     */
    @Test
    void registerUser_resolvesTheCorrectInstitutionAmongMultiple_notJustTheFirstById() {
        User toRegister = new User();
        toRegister.setEmail("new@ridgeview.edu");
        toRegister.setStaffOrStudentId("20551234");
        toRegister.setPassword("plaintext");

        Institution knust = institution(1L); // emailDomain "knust.edu.gh", sorts first
        Institution ridgeview = new Institution();
        ridgeview.setId(2L);
        ridgeview.setName("Ridgeview University");
        ridgeview.setEmailDomain("ridgeview.edu");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStaffOrStudentId(anyString())).thenReturn(false);
        when(institutionRepository.findAll()).thenReturn(List.of(knust, ridgeview));
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User saved = userService.registerUser(toRegister);

        assertThat(saved.getInstitution()).isEqualTo(ridgeview);
        assertThat(saved.getInstitution()).isNotEqualTo(knust);
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
        verify(institutionRepository, never()).findAll();
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
        // Scoped from the admin, not a domain-based lookup.
        verify(institutionRepository, never()).findAll();
    }

    /**
     * Institution assignment always comes from the acting admin, never the
     * email — so an email that doesn't belong to the admin's own institution
     * must be rejected outright, rather than silently creating an account
     * whose email domain disagrees with the institution it's actually scoped to.
     */
    @Test
    void createByAdmin_rejectsAnEmailOutsideTheAdminsInstitutionDomain() {
        Institution ridgeview = institution(7L);
        ridgeview.setEmailDomain("ridgeview.edu");
        User admin = user(1L, ridgeview);
        AdminCreateUserRequest request = adminRequest(); // email is ama.mensah@knust.edu.gh

        assertThatThrownBy(() -> userService.createByAdmin(request, admin))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ridgeview.edu");

        verify(userRepository, never()).save(any());
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
