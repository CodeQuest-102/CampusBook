import { apiFetch } from './client';
import type { NotificationResponse, PagedResponse } from './types';

/** One page of notifications, newest first. Defaults match the server (page 0, size 20). */
export function listNotifications(
  page = 0,
  size = 20,
): Promise<PagedResponse<NotificationResponse>> {
  return apiFetch<PagedResponse<NotificationResponse>>(
    `/api/notifications?page=${page}&size=${size}`,
  );
}

export function unreadCount(): Promise<{ unreadCount: number }> {
  return apiFetch<{ unreadCount: number }>('/api/notifications/unread-count');
}

export function markAsRead(id: number | string): Promise<NotificationResponse> {
  return apiFetch<NotificationResponse>(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllAsRead(): Promise<void> {
  return apiFetch<void>('/api/notifications/read-all', { method: 'PATCH' });
}
