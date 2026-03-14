import { apiRequest } from "@/src/api/client";

export type UserSearchResult = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export const searchUsers = (query: string) =>
  apiRequest<UserSearchResult[]>(
    `/users/search?q=${encodeURIComponent(query)}`
  );
