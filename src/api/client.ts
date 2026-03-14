import {
  clearStoredAuth,
  getAccessToken,
  getRefreshToken,
  setAccessToken
} from "@/src/lib/auth-storage";

type ApiConfig = {
  auth?: boolean;
  retry?: boolean;
};

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

let refreshPromise: Promise<boolean> | null = null;

const parseResponse = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const unwrapData = <T>(payload: any): T => {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data as T;
  }

  return payload as T;
};

const getApiBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not configured. Add it to your mobile .env file."
    );
  }

  return apiUrl.replace(/\/$/, "");
};

const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiBaseUrl()}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }

        const payload = await parseResponse(response);
        const token =
          payload?.data?.accessToken || payload?.accessToken || null;

        if (!token) {
          return false;
        }

        await setAccessToken(token);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
  config: ApiConfig = { auth: true, retry: true }
) => {
  const { auth = true, retry = true } = config;
  const { method = "GET", headers = {}, body } = options;
  const finalHeaders = { ...headers };

  let finalBody = body;

  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  if (auth) {
    const token = await getAccessToken();

    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody as BodyInit | null | undefined
  });

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiRequest<T>(path, options, { auth: true, retry: false });
    }

    await clearStoredAuth();
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed");
    (error as Error & { status?: number; data?: unknown }).status =
      response.status;
    (error as Error & { status?: number; data?: unknown }).data = payload;
    throw error;
  }

  return unwrapData<T>(payload);
};
