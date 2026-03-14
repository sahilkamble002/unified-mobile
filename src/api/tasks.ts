import { apiRequest } from "@/src/api/client";

export type EventTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  createdAt: string;
  assignments?: {
    id: string;
    progress: number;
    user?: {
      id: string;
      name: string;
      username?: string | null;
      email?: string | null;
    } | null;
  }[];
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
};

export type AssignTaskPayload = {
  username: string;
};

export type UpdateTaskStatusPayload = {
  status: string;
};

export type UpdateTaskProgressPayload = {
  progress: number;
};

export const getEventTasks = (eventId: string) =>
  apiRequest<EventTask[]>(`/tasks/${eventId}/tasks`);

export const createTask = (eventId: string, payload: CreateTaskPayload) =>
  apiRequest<EventTask>(`/tasks/${eventId}/tasks`, {
    method: "POST",
    body: payload
  });

export const assignTask = (taskId: string, payload: AssignTaskPayload) =>
  apiRequest<void>(`/tasks/${taskId}/assign`, {
    method: "POST",
    body: payload
  });

export const updateTaskStatus = (
  taskId: string,
  payload: UpdateTaskStatusPayload
) =>
  apiRequest<EventTask>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    body: payload
  });

export const updateTaskProgress = (
  taskId: string,
  payload: UpdateTaskProgressPayload
) =>
  apiRequest<void>(`/tasks/${taskId}/progress`, {
    method: "PATCH",
    body: payload
  });

export const deleteTask = (taskId: string) =>
  apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE"
  });
