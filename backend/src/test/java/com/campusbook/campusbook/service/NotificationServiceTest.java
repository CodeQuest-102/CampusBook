package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Institution;
import com.campusbook.campusbook.entity.Notification;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.enums.NotificationType;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.repository.NotificationRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @InjectMocks NotificationService notificationService;

    private User user(long id, Role role) {
        Institution institution = new Institution();
        institution.setId(1L);
        User u = new User();
        u.setId(id);
        u.setFullName("Test User " + id);
        u.setRole(role);
        u.setInstitution(institution);
        return u;
    }

    private Notification notification(long id, User owner) {
        Notification n = new Notification();
        n.setId(id);
        n.setUser(owner);
        n.setType(NotificationType.BOOKING_APPROVED);
        n.setTitle("Booking approved");
        n.setMessage("Your booking was approved");
        n.setRead(false);
        return n;
    }

    /* ------------------------------- notifyUser ------------------------------ */

    @Test
    void notifyUser_savesANotificationForTheRecipient() {
        User recipient = user(5L, Role.STUDENT_LEADER);

        notificationService.notifyUser(recipient, NotificationType.BOOKING_REJECTED,
                "Booking rejected", "Your booking was rejected", 42L);

        verify(notificationRepository).save(argThat(n ->
                n.getUser().equals(recipient)
                        && n.getType() == NotificationType.BOOKING_REJECTED
                        && n.getTitle().equals("Booking rejected")
                        && n.getMessage().equals("Your booking was rejected")
                        && n.getRelatedBookingId().equals(42L)));
    }

    @Test
    void notifyUser_allowsANullRelatedBookingId() {
        User recipient = user(5L, Role.STUDENT_LEADER);

        notificationService.notifyUser(recipient, NotificationType.NEW_BOOKING_REQUEST,
                "New request", "A new booking request", null);

        verify(notificationRepository).save(argThat(n -> n.getRelatedBookingId() == null));
    }

    /* ------------------------- notifyInstitutionAdmins ------------------------ */

    @Test
    void notifyInstitutionAdmins_notifiesEveryAdminAtTheInstitution() {
        User admin1 = user(1L, Role.ADMIN);
        User admin2 = user(2L, Role.ADMIN);
        when(userRepository.findByInstitutionIdAndRole(1L, Role.ADMIN)).thenReturn(List.of(admin1, admin2));

        notificationService.notifyInstitutionAdmins(1L, NotificationType.NEW_BOOKING_REQUEST,
                "New request", "Someone requested a room", 7L);

        verify(notificationRepository, times(2)).save(argThat(n ->
                n.getType() == NotificationType.NEW_BOOKING_REQUEST && n.getRelatedBookingId().equals(7L)));
        verify(notificationRepository).save(argThat(n -> n.getUser().equals(admin1)));
        verify(notificationRepository).save(argThat(n -> n.getUser().equals(admin2)));
    }

    @Test
    void notifyInstitutionAdmins_doesNothingWhenNoAdminsExist() {
        when(userRepository.findByInstitutionIdAndRole(1L, Role.ADMIN)).thenReturn(List.of());

        notificationService.notifyInstitutionAdmins(1L, NotificationType.NEW_BOOKING_REQUEST,
                "New request", "Someone requested a room", 7L);

        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    /* --------------------------- getNotificationsForUser --------------------------- */

    @Test
    void getNotificationsForUser_listOverload_delegatesToRepository() {
        List<Notification> expected = List.of(notification(1L, user(5L, Role.STUDENT_LEADER)));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(5L)).thenReturn(expected);

        assertThat(notificationService.getNotificationsForUser(5L)).isEqualTo(expected);
    }

    @Test
    void getNotificationsForUser_pagedOverload_passesThePageableThrough() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Notification> expected = new PageImpl<>(List.of(notification(1L, user(5L, Role.STUDENT_LEADER))));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(5L, pageable)).thenReturn(expected);

        assertThat(notificationService.getNotificationsForUser(5L, pageable)).isEqualTo(expected);
    }

    /* ------------------------------ getUnreadCount ----------------------------- */

    @Test
    void getUnreadCount_delegatesToRepository() {
        when(notificationRepository.countByUserIdAndIsReadFalse(5L)).thenReturn(3L);

        assertThat(notificationService.getUnreadCount(5L)).isEqualTo(3L);
    }

    /* -------------------------------- markAsRead -------------------------------- */

    @Test
    void markAsRead_marksTheNotificationReadWhenOwnedByTheRequester() {
        User owner = user(5L, Role.STUDENT_LEADER);
        Notification n = notification(10L, owner);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));
        when(notificationRepository.save(n)).thenReturn(n);

        Notification result = notificationService.markAsRead(10L, 5L);

        assertThat(result.isRead()).isTrue();
        verify(notificationRepository).save(n);
    }

    @Test
    void markAsRead_rejectsMarkingSomeoneElsesNotification() {
        User owner = user(5L, Role.STUDENT_LEADER);
        Notification n = notification(10L, owner);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));

        assertThatThrownBy(() -> notificationService.markAsRead(10L, 99L))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("only mark your own");

        assertThat(n.isRead()).isFalse();
        verify(notificationRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void markAsRead_throwsNotFoundWhenTheNotificationDoesNotExist() {
        when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(404L, 5L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Notification not found");
    }

    /* ------------------------------- markAllAsRead ------------------------------ */

    @Test
    void markAllAsRead_marksEveryUnreadNotificationAndSavesTheBatch() {
        User owner = user(5L, Role.STUDENT_LEADER);
        Notification first = notification(1L, owner);
        Notification second = notification(2L, owner);
        when(notificationRepository.findUnreadByUserId(5L)).thenReturn(List.of(first, second));

        notificationService.markAllAsRead(5L);

        assertThat(first.isRead()).isTrue();
        assertThat(second.isRead()).isTrue();
        verify(notificationRepository).saveAll(eq(List.of(first, second)));
    }

    @Test
    void markAllAsRead_isANoOpWhenNothingIsUnread() {
        when(notificationRepository.findUnreadByUserId(5L)).thenReturn(List.of());

        notificationService.markAllAsRead(5L);

        verify(notificationRepository).saveAll(List.of());
    }
}
