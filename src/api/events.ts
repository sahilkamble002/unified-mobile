import { apiRequest } from "@/src/api/client";

export type EventMembership = {
  id: string;
  role: string;
  event: {
    id: string;
    name: string;
    description?: string | null;
  };
};

export type EventMember = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
};

export type EventDetails = {
  id: string;
  name: string;
  description?: string | null;
  donationUpiId?: string | null;
  fundingGoal?: number | null;
  createdBy?: {
    id: string;
    name: string;
    username: string;
    email: string;
  } | null;
  members: EventMember[];
};

export type CreateEventPayload = {
  name: string;
  description?: string;
  donationUpiId?: string | null;
  fundingGoal?: number | null;
};

export type UpdateEventPayload = {
  name?: string;
  description?: string;
  donationUpiId?: string | null;
  fundingGoal?: number | null;
};

export type AddEventMemberPayload = {
  username: string;
  role: string;
};

export type UpdateMemberRolePayload = {
  role: string;
};

export const getEvents = () => apiRequest<EventMembership[]>("/events");

export const getEventById = (eventId: string) =>
  apiRequest<EventDetails>(`/events/${eventId}`);

export const createEvent = (payload: CreateEventPayload) =>
  apiRequest<EventMembership>(
    "/events",
    {
      method: "POST",
      body: payload
    }
  );

export const updateEvent = (eventId: string, payload: UpdateEventPayload) =>
  apiRequest<EventDetails>(`/events/${eventId}`, {
    method: "PATCH",
    body: payload
  });

export const deleteEvent = (eventId: string) =>
  apiRequest<void>(`/events/${eventId}`, {
    method: "DELETE"
  });

export const addEventMember = (
  eventId: string,
  payload: AddEventMemberPayload
) =>
  apiRequest<EventMember>(`/events/${eventId}/members`, {
    method: "POST",
    body: payload
  });

export const updateMemberRole = (
  eventId: string,
  username: string,
  payload: UpdateMemberRolePayload
) =>
  apiRequest<EventMember>(
    `/events/${eventId}/members/${encodeURIComponent(username)}`,
    {
      method: "PATCH",
      body: payload
    }
  );

export const removeEventMember = (eventId: string, username: string) =>
  apiRequest<void>(`/events/${eventId}/members/${encodeURIComponent(username)}`, {
    method: "DELETE"
  });
