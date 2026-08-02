package com.campusbook.campusbook.service;
import com.campusbook.campusbook.dto.AdminCreateUserRequest;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.repository.UserRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.campusbook.campusbook.exception.DuplicateUserException;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.util.EmailDomainMatcher;
import java.util.Comparator;
import java.util.List;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private InstitutionRepository institutionRepository;

    public User registerUser(User user) {
        assertNotAlreadyRegistered(user.getEmail(), user.getStaffOrStudentId());

        Institution institution = resolveInstitutionForEmail(user.getEmail());
        user.setInstitution(institution);

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    /**
     * Multi-campus self-registration is domain-based: the registering email's
     * domain must match one institution's registered domain, exactly or via
     * any subdomain (see EmailDomainMatcher). Institution counts are small for
     * a B2B product (dozens at most), so this loads them all and matches in
     * Java rather than pushing suffix logic into SQL.
     *
     * <p>When more than one institution's domain matches (e.g. both "edu.gh"
     * and "knust.edu.gh" are registered and the email is "x@st.knust.edu.gh"),
     * the most specific — longest — matching domain wins, so a broadly
     * registered domain can't swallow a more specific one owned by another
     * institution.
     */
    private Institution resolveInstitutionForEmail(String email) {
        String domain = EmailDomainMatcher.domainOf(email);
        if (domain == null) {
            throw new IllegalArgumentException("Enter a valid email address");
        }
        return institutionRepository.findAll().stream()
                .filter(i -> EmailDomainMatcher.matches(domain, i.getEmailDomain()))
                .max(Comparator.comparingInt(i -> i.getEmailDomain().length()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "We don't recognize \"" + domain + "\" as a registered institution email domain. "
                                + "Contact your institution's administrator if you believe this is a mistake."));
    }

    /**
     * Provision an account on behalf of an admin. The institution comes from the
     * acting admin rather than resolved from the registering email's domain —
     * an admin can only ever create colleagues at their own campus, which is
     * what keeps the multi-campus isolation intact on the write side too.
     */
    public User createByAdmin(AdminCreateUserRequest request, User admin) {
        assertNotAlreadyRegistered(request.getEmail(), request.getStaffOrStudentId());

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim());
        user.setStaffOrStudentId(request.getStaffOrStudentId().trim());
        user.setRole(request.getRole());
        user.setDepartment(request.getDepartment() == null ? null : request.getDepartment().trim());
        user.setInstitution(admin.getInstitution());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        return userRepository.save(user);
    }

    /** Email and campus ID are both unique across the whole system, not per campus. */
    private void assertNotAlreadyRegistered(String email, String staffOrStudentId) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateUserException("Email already registered");
        }
        if (userRepository.existsByStaffOrStudentId(staffOrStudentId)) {
            throw new DuplicateUserException("Staff/Student ID already registered");
        }
    }

    public User findByEmailOrStaffId(String emailOrId) {
        return userRepository.findByEmail(emailOrId)
                .or(() -> userRepository.findByStaffOrStudentId(emailOrId))
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));
    }

    /**
     * The user directory for one campus. Scoped like every other read in the
     * app — an admin at one institution has no business seeing another's staff
     * and students.
     */
    public List<User> getUsersForInstitution(Long institutionId) {
        return userRepository.findByInstitutionId(institutionId);
    }

    public User updateProfile(Long userId, com.campusbook.campusbook.dto.UpdateProfileRequest patch) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (patch.getFullName() != null && !patch.getFullName().isBlank()) {
            user.setFullName(patch.getFullName().trim());
        }
        if (patch.getDepartment() != null) {
            user.setDepartment(patch.getDepartment().trim());
        }
        return userRepository.save(user);
    }
}