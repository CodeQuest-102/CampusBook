package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.EmailVerificationToken;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.repository.EmailVerificationTokenRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock UserRepository userRepository;
    @Mock EmailVerificationTokenRepository tokenRepository;
    @Mock EmailVerificationMailer mailer;
    @Captor ArgumentCaptor<EmailVerificationToken> tokenCaptor;

    // Real encoder so hashing/matching behaves like production.
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        service = new EmailVerificationService(userRepository, tokenRepository, encoder, mailer);
    }

    private User user() {
        User u = new User();
        u.setId(1L);
        u.setFullName("Test User");
        u.setEmail("student@st.knust.edu.gh");
        u.setStaffOrStudentId("20551234");
        u.setPassword(encoder.encode("password"));
        u.setEmailVerified(false);
        return u;
    }

    private EmailVerificationToken tokenFor(User user, String code, LocalDateTime expiresAt) {
        EmailVerificationToken t = new EmailVerificationToken();
        t.setUser(user);
        t.setTokenHash(encoder.encode(code));
        t.setExpiresAt(expiresAt);
        t.setCreatedAt(LocalDateTime.now());
        return t;
    }

    /* -------------------------- requestVerification -------------------------- */

    @Test
    void requestVerification_unknownAccount_isSilentNoOp() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId(any())).thenReturn(Optional.empty());

        service.requestVerification("ghost@st.knust.edu.gh");

        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(mailer);
    }

    @Test
    void requestVerification_alreadyVerifiedAccount_isSilentNoOp() {
        User user = user();
        user.setEmailVerified(true);
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));

        service.requestVerification("student@st.knust.edu.gh");

        verify(tokenRepository, never()).invalidateAllForUser(any(), any());
        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(mailer);
    }

    @Test
    void requestVerification_unverifiedAccount_invalidatesOldTokensAndSendsCode() {
        User user = user();
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.requestVerification("student@st.knust.edu.gh");

        verify(tokenRepository).invalidateAllForUser(eq(1L), any());
        verify(tokenRepository).save(tokenCaptor.capture());
        // The code is hashed (bcrypt), never stored in the clear.
        assertThat(tokenCaptor.getValue().getTokenHash()).startsWith("$2");
        assertThat(tokenCaptor.getValue().getExpiresAt()).isAfter(LocalDateTime.now());
        verify(mailer).sendVerificationCode(eq(user), any(), eq(10));
    }

    /* -------------------------- confirmVerification --------------------------- */

    @Test
    void confirmVerification_correctCode_marksVerifiedAndConsumesToken() {
        User user = user();
        EmailVerificationToken token = tokenFor(user, "123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(eq(1L), any())).thenReturn(Optional.of(token));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        User result = service.confirmVerification("student@st.knust.edu.gh", "123456");

        assertThat(token.getConsumedAt()).isNotNull();
        assertThat(result.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
    }

    @Test
    void confirmVerification_alreadyVerifiedAccount_isIdempotent_returnsUserWithoutConsultingTokens() {
        User user = user();
        user.setEmailVerified(true);
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));

        User result = service.confirmVerification("student@st.knust.edu.gh", "000000");

        assertThat(result).isEqualTo(user);
        verify(tokenRepository, never()).findActiveForUser(any(), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmVerification_wrongCode_incrementsAttemptsAndRejects() {
        User user = user();
        EmailVerificationToken token = tokenFor(user, "123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmVerification("student@st.knust.edu.gh", "000000"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(token.getAttempts()).isEqualTo(1);
        assertThat(token.getConsumedAt()).isNull(); // not burned yet
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmVerification_fifthWrongCode_burnsTheToken() {
        User user = user();
        EmailVerificationToken token = tokenFor(user, "123456", LocalDateTime.now().plusMinutes(5));
        token.setAttempts(4); // this is the 5th try
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmVerification("student@st.knust.edu.gh", "000000"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(token.getAttempts()).isEqualTo(5);
        assertThat(token.getConsumedAt()).isNotNull(); // burned — no more guesses
    }

    @Test
    void confirmVerification_noActiveToken_rejects() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user()));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmVerification("student@st.knust.edu.gh", "123456"))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmVerification_unknownAccount_rejectsWithGenericError() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmVerification("ghost@st.knust.edu.gh", "123456"))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
