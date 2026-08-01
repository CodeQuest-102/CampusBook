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

        Institution institution = institutionRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("No institution configured"));
        user.setInstitution(institution);

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    /**
     * Provision an account on behalf of an admin. The institution comes from the
     * acting admin rather than {@code findFirstByOrderByIdAsc} — an admin can
     * only ever create colleagues at their own campus, which is what keeps the
     * multi-campus isolation intact on the write side too.
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