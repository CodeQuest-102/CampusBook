import { apiFetch } from './client';
import type { NotificationResponse } from './types';

export function listNotifications(): Promise<NotificationResponse[]> {
  return apiFetch<NotificationResponse[]>('/api/notifications');
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
