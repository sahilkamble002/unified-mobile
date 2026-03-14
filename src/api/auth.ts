import { apiRequest } from "@/src/api/client";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload
} from "@/src/types/auth";

export const login = (payload: LoginPayload) =>
  apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: payload
    },
    { auth: false, retry: false }
  );

export const register = (payload: RegisterPayload) =>
  apiRequest(
    "/users/register",
    {
      method: "POST",
      body: payload
    },
    { auth: false, retry: false }
  );

export const logout = (refreshToken: string) =>
  apiRequest(
    "/auth/logout",
    {
      method: "POST",
      body: { refreshToken }
    },
    { auth: false, retry: false }
  );
