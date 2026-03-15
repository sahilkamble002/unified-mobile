import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { User } from "@/src/types/auth";

const ACCESS_TOKEN_KEY = "erp_access_token";
const REFRESH_TOKEN_KEY = "erp_refresh_token";
const USER_KEY = "erp_user";
const isWeb = Platform.OS === "web";

const canUseSecureStore =
  typeof SecureStore.getItemAsync === "function" &&
  typeof SecureStore.setItemAsync === "function" &&
  typeof SecureStore.deleteItemAsync === "function";

const getWebStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getItem = async (key: string) => {
  if (isWeb) {
    return getWebStorage()?.getItem(key) ?? null;
  }

  if (!canUseSecureStore) {
    return null;
  }

  return SecureStore.getItemAsync(key);
};

const setItem = async (key: string, value: string) => {
  if (isWeb) {
    getWebStorage()?.setItem(key, value);
    return;
  }

  if (!canUseSecureStore) {
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

const deleteItem = async (key: string) => {
  if (isWeb) {
    getWebStorage()?.removeItem(key);
    return;
  }

  if (!canUseSecureStore) {
    return;
  }

  await SecureStore.deleteItemAsync(key);
};

export const getAccessToken = () => getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);

export const getStoredUser = async () => {
  const raw = await getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    await deleteItem(USER_KEY);
    return null;
  }
};

export const setAccessToken = (token: string | null) => {
  if (token) {
    return setItem(ACCESS_TOKEN_KEY, token);
  }

  return deleteItem(ACCESS_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    return setItem(REFRESH_TOKEN_KEY, token);
  }

  return deleteItem(REFRESH_TOKEN_KEY);
};

export const setStoredUser = (user: User | null) => {
  if (user) {
    return setItem(USER_KEY, JSON.stringify(user));
  }

  return deleteItem(USER_KEY);
};

export const clearStoredAuth = async () => {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(USER_KEY)
  ]);
};
