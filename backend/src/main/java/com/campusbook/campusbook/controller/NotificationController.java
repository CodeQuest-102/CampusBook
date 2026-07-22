package com.campusbook.campusbook.controller;

import com.campusbook.campusbook.dto.NotificationResponse;
import com.campusbook.campusbook.dto.PagedResponse;
import com.campusbook.campusbook.entity.User;
import com.campusbook.campusbook.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    /** Page size defaults and cap — a client can't ask for an unbounded page. */
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    @Autowired
    private NotificationService notificationService;

    /**
     * A user's notifications, newest first, paginated. Notifications accumulate
     * without bound over an account's life, so this list is never returned whole.
     */
    @GetMapping
    public ResponseEntity<PagedResponse<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), clampSize(size));
        return ResponseEntity.ok(PagedResponse.from(
                notificationService.getNotificationsForUser(user.getId(), pageable),
                NotificationResponse::from));
    }

    private int clampSize(int size) {
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(user.getId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(NotificationResponse.from(notificationService.markAsRead(id, user.getId())));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.noContent().build();
    }
}