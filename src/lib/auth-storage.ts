import * as SecureStore from "expo-secure-store";
import type { User } from "@/src/types/auth";

const ACCESS_TOKEN_KEY = "erp_access_token";
const REFRESH_TOKEN_KEY = "erp_refresh_token";
const USER_KEY = "erp_user";

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const getRefreshToken = () =>
  SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const getStoredUser = async () => {
  const raw = await SecureStore.getItemAsync(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
};

export const setAccessToken = (token: string | null) => {
  if (token) {
    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }

  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }

  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const setStoredUser = (user: User | null) => {
  if (user) {
    return SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  return SecureStore.deleteItemAsync(USER_KEY);
};

export const clearStoredAuth = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY)
  ]);
};
