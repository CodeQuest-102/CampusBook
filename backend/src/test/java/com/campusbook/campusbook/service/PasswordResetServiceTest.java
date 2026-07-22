package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.PasswordResetToken;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.InvalidCredentialsException;
import com.campusbook.campusbook.repository.PasswordResetTokenRepository;
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
class PasswordResetServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordResetTokenRepository tokenRepository;
    @Mock PasswordResetMailer mailer;
    @Captor ArgumentCaptor<PasswordResetToken> tokenCaptor;

    // Real encoder so hashing/matching behaves like production.
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(userRepository, tokenRepository, encoder, mailer);
    }

    private User user() {
        User u = new User();
        u.setId(1L);
        u.setFullName("Test User");
        u.setEmail("student@st.knust.edu.gh");
        u.setStaffOrStudentId("20551234");
        u.setPassword(encoder.encode("oldpassword"));
        return u;
    }

    private PasswordResetToken tokenFor(String code, LocalDateTime expiresAt) {
        PasswordResetToken t = new PasswordResetToken();
        t.setUser(user());
        t.setTokenHash(encoder.encode(code));
        t.setExpiresAt(expiresAt);
        t.setCreatedAt(LocalDateTime.now());
        return t;
    }

    /* ----------------------------- requestReset ----------------------------- */

    @Test
    void requestReset_unknownAccount_isSilentNoOp() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId(any())).thenReturn(Optional.empty());

        service.requestReset("ghost@st.knust.edu.gh");

        // No token, no mail — nothing observable that could confirm (non)existence.
        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(mailer);
    }

    @Test
    void requestReset_existingAccount_invalidatesOldTokensAndSendsCode() {
        User user = user();
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.requestReset("student@st.knust.edu.gh");

        verify(tokenRepository).invalidateAllForUser(eq(1L), any());
        verify(tokenRepository).save(tokenCaptor.capture());
        // The code is hashed (bcrypt), never stored in the clear.
        assertThat(tokenCaptor.getValue().getTokenHash()).startsWith("$2");
        assertThat(tokenCaptor.getValue().getExpiresAt()).isAfter(LocalDateTime.now());
        verify(mailer).sendResetCode(eq(user), any(), eq(10));
    }

    /* ----------------------------- confirmReset ----------------------------- */

    @Test
    void confirmReset_correctCode_setsNewPasswordAndConsumesToken() {
        User user = user();
        PasswordResetToken token = tokenFor("123456", LocalDateTime.now().plusMinutes(5));
        token.setUser(user);
        when(userRepository.findByEmail("student@st.knust.edu.gh")).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(eq(1L), any())).thenReturn(Optional.of(token));

        service.confirmReset("student@st.knust.edu.gh", "123456", "newpassword");

        assertThat(token.getConsumedAt()).isNotNull();
        assertThat(encoder.matches("newpassword", user.getPassword())).isTrue();
        verify(userRepository).save(user);
    }

    @Test
    void confirmReset_wrongCode_incrementsAttemptsAndRejects() {
        User user = user();
        PasswordResetToken token = tokenFor("123456", LocalDateTime.now().plusMinutes(5));
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmReset("student@st.knust.edu.gh", "000000", "newpassword"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(token.getAttempts()).isEqualTo(1);
        assertThat(token.getConsumedAt()).isNull(); // not burned yet
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmReset_fifthWrongCode_burnsTheToken() {
        User user = user();
        PasswordResetToken token = tokenFor("123456", LocalDateTime.now().plusMinutes(5));
        token.setAttempts(4); // this is the 5th try
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.confirmReset("student@st.knust.edu.gh", "000000", "newpassword"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(token.getAttempts()).isEqualTo(5);
        assertThat(token.getConsumedAt()).isNotNull(); // burned — no more guesses
    }

    @Test
    void confirmReset_noActiveToken_rejects() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user()));
        when(tokenRepository.findActiveForUser(anyLong(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmReset("student@st.knust.edu.gh", "123456", "newpassword"))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmReset_unknownAccount_rejectsWithGenericError() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.findByStaffOrStudentId(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirmReset("ghost@st.knust.edu.gh", "123456", "newpassword"))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
