package com.campusbook.campusbook.service;

import com.campusbook.campusbook.dto.CreatePlatformInstitutionRequest;
import com.campusbook.campusbook.dto.InstitutionSummaryResponse;
import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.repository.BookingRepository;
import com.campusbook.campusbook.repository.HallRepository;
import com.campusbook.campusbook.repository.InstitutionRepository;
import com.campusbook.campusbook.repository.UserRepository;
import com.campusbook.campusbook.util.EmailDomainMatcher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlatformAdminService {

    @Autowired
    private InstitutionRepository institutionRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private HallRepository hallRepository;
    @Autowired
    private BookingRepository bookingRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private UserService userService;

    /**
     * Creates a new institution together with its first admin account in one
     * transaction, so onboarding can never leave a half-created institution
     * with no one able to log into it.
     */
    @Transactional
    public InstitutionSummaryResponse createInstitution(CreatePlatformInstitutionRequest request) {
        String name = request.getInstitutionName().trim();
        String domain = request.getEmailDomain().trim().toLowerCase();

        if (institutionRepository.existsByName(name)) {
            throw new IllegalArgumentException("An institution named \"" + name + "\" already exists.");
        }
        if (institutionRepository.existsByEmailDomain(domain)) {
            throw new IllegalArgumentException("An institution with the domain \"" + domain + "\" already exists.");
        }

        String adminDomain = EmailDomainMatcher.domainOf(request.getAdminEmail());
        if (adminDomain == null || !EmailDomainMatcher.matches(adminDomain, domain)) {
            throw new IllegalArgumentException(
                    "The admin's email must belong to the institution's own domain (" + domain + ").");
        }

        userService.assertNotAlreadyRegistered(request.getAdminEmail(), request.getAdminStaffOrStudentId());

        Institution institution = new Institution();
        institution.setName(name);
        institution.setEmailDomain(domain);
        institution.setTier(request.getTier());
        Institution saved = institutionRepository.save(institution);

        User admin = new User();
        admin.setFullName(request.getAdminFullName().trim());
        admin.setEmail(request.getAdminEmail().trim());
        admin.setStaffOrStudentId(request.getAdminStaffOrStudentId().trim());
        admin.setRole(Role.ADMIN);
        admin.setDepartment(request.getAdminDepartment() == null ? null : request.getAdminDepartment().trim());
        admin.setInstitution(saved);
        admin.setPassword(passwordEncoder.encode(request.getAdminPassword()));
        userRepository.save(admin);

        return toSummary(saved);
    }

    /**
     * Every real institution in the system with basic usage stats — the
     * seeded "CampusBook Internal" institution is excluded, since it isn't a
     * customer, just a home for platform-admin accounts.
     */
    public List<InstitutionSummaryResponse> listInstitutions() {
        return institutionRepository.findAll().stream()
                .filter(i -> !i.isInternal())
                .map(this::toSummary)
                .toList();
    }

    private InstitutionSummaryResponse toSummary(Institution institution) {
        long hallCount = hallRepository.countByInstitutionId(institution.getId());
        long bookingCount = bookingRepository.countByHallInstitutionId(institution.getId());
        long userCount = userRepository.countByInstitutionId(institution.getId());
        return InstitutionSummaryResponse.from(institution, hallCount, bookingCount, userCount);
    }
}
