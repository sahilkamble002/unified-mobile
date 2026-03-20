import { apiRequest } from "@/src/api/client";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  isRead: boolean;
  eventId?: string | null;
  createdAt: string;
};

export type CreateEventNotificationPayload = {
  title: string;
  message: string;
  type?: string;
};

export const getNotifications = () =>
  apiRequest<NotificationItem[]>("/notifications");

export const markNotificationRead = (notificationId: string) =>
  apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: "PATCH"
  });

export const registerPushToken = (payload: {
  token: string;
  platform: "ANDROID" | "IOS";
}) =>
  apiRequest("/notifications/push-token", {
    method: "POST",
    body: payload
  });

export const unregisterPushToken = (token: string) =>
  apiRequest("/notifications/push-token", {
    method: "DELETE",
    body: { token }
  });

export const createEventNotification = (
  eventId: string,
  payload: CreateEventNotificationPayload
) =>
  apiRequest<{ count: number }>(`/notifications/event/${eventId}`, {
    method: "POST",
    body: payload
  });
