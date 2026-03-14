import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import * as authApi from "@/src/api/auth";
import {
  clearStoredAuth,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredUser
} from "@/src/lib/auth-storage";
import type {
  AuthContextValue,
  LoginPayload,
  RegisterPayload,
  User
} from "@/src/types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedUser, accessToken, refreshToken] = await Promise.all([
          getStoredUser(),
          getAccessToken(),
          getRefreshToken()
        ]);

        if (storedUser && (accessToken || refreshToken)) {
          setUser(storedUser);
        } else {
          await clearStoredAuth();
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);

    try {
      const data = await authApi.login(payload);

      if (data?.accessToken) {
        await setAccessToken(data.accessToken);
      }

      if (data?.refreshToken) {
        await setRefreshToken(data.refreshToken);
      }

      if (data?.user) {
        await setStoredUser(data.user);
        setUser(data.user);
      }

      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);

    try {
      return await authApi.register(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = await getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ignore logout failures so the device can still clear its session
    } finally {
      await clearStoredAuth();
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isBootstrapping,
      login,
      register,
      logout
    }),
    [user, isLoading, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
