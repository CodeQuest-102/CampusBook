package com.campusbook.campusbook.service;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.repository.UserRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.campusbook.campusbook.exception.DuplicateUserException;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
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
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new DuplicateUserException("Email already registered");
        }
        if (userRepository.existsByStaffOrStudentId(user.getStaffOrStudentId())) {
            throw new DuplicateUserException("Staff/Student ID already registered");
        }

        Institution institution = institutionRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("No institution configured"));
        user.setInstitution(institution);

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User findByEmailOrStaffId(String emailOrId) {
        return userRepository.findByEmail(emailOrId)
                .or(() -> userRepository.findByStaffOrStudentId(emailOrId))
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateProfile(Long userId, com.campusbook.campusbook.dto.UpdateProfileRequest patch) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (patch.getFullName() != null && !patch.getFullName().isBlank()) {
            user.setFullName(patch.getFullName().trim());
        }
        if (patch.getDepartment() != null) {
            user.setDepartment(patch.getDepartment().trim());
        }
        return userRepository.save(user);
    }

    /**
     * Simplified self-service reset: verifies the account and that the supplied
     * staff/student ID matches, then sets a new password. A production flow would
     * instead email a one-time token.
     */
    public void resetPassword(String emailOrId, String staffOrStudentId, String newPassword) {
        User user = findByEmailOrStaffId(emailOrId);
        if (!user.getStaffOrStudentId().equalsIgnoreCase(staffOrStudentId.trim())) {
            throw new InvalidCredentialsException("Account details do not match");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}