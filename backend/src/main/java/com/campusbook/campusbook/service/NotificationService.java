package com.campusbook.campusbook.service;

import com.campusbook.campusbook.entity.Notification;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.exception.ResourceNotFoundException;
import com.campusbook.campusbook.enums.NotificationType;
import com.campusbook.campusbook.enums.Role;
import com.campusbook.campusbook.repository.NotificationRepository;
import com.campusbook.campusbook.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public void notifyUser(User recipient, NotificationType type, String title, String message, Long relatedBookingId) {
        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRelatedBookingId(relatedBookingId);
        notificationRepository.save(notification);
    }

    public void notifyInstitutionAdmins(Long institutionId, NotificationType type, String title, String message, Long relatedBookingId) {
        List<User> admins = userRepository.findByInstitutionIdAndRole(institutionId, Role.ADMIN);
        for (User admin : admins) {
            notifyUser(admin, type, title, message, relatedBookingId);
        }
    }

    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public org.springframework.data.domain.Page<Notification> getNotificationsForUser(
            Long userId, org.springframework.data.domain.Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public Notification markAsRead(Long notificationId, Long requestingUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(requestingUserId)) {
            throw new SecurityException("You can only mark your own notifications as read");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findUnreadByUserId(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }
}