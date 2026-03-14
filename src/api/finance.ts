import { apiRequest } from "@/src/api/client";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type FinanceSummary = {
  totalDonations: number;
  totalExpenses: number;
  balance: number;
};

export type Donation = {
  id: string;
  donorName: string;
  amount: number;
  paymentMethod?: string | null;
  referenceId?: string | null;
  status?: string | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username?: string | null;
  } | null;
};

export type DonationListResponse = {
  donations: Donation[];
  pagination: Pagination;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  pagination: Pagination;
};

export type DonationQrResponse = {
  qrCode: string;
};

export type CreateDonationPayload = {
  donorName: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
};

export type CreateExpensePayload = {
  title: string;
  amount: number;
};

const buildQueryString = (params: { page?: number; limit?: number } = {}) => {
  const parts: string[] = [];

  if (typeof params.page === "number") {
    parts.push(`page=${encodeURIComponent(String(params.page))}`);
  }

  if (typeof params.limit === "number") {
    parts.push(`limit=${encodeURIComponent(String(params.limit))}`);
  }

  return parts.length ? `?${parts.join("&")}` : "";
};

export const getFinanceSummary = (eventId: string) =>
  apiRequest<FinanceSummary>(`/finance/${eventId}/summary`);

export const createDonation = (
  eventId: string,
  payload: CreateDonationPayload
) =>
  apiRequest<Donation>(`/finance/${eventId}/donate`, {
    method: "POST",
    body: payload
  });

export const getEventDonations = (
  eventId: string,
  params: { page?: number; limit?: number } = {}
) => {
  return apiRequest<DonationListResponse>(
    `/finance/${eventId}/donations${buildQueryString(params)}`
  );
};

export const getEventExpenses = (
  eventId: string,
  params: { page?: number; limit?: number } = {}
) => {
  return apiRequest<ExpenseListResponse>(
    `/finance/${eventId}/expenses${buildQueryString(params)}`
  );
};

export const createExpense = (
  eventId: string,
  payload: CreateExpensePayload
) =>
  apiRequest<Expense>(`/finance/${eventId}/expense`, {
    method: "POST",
    body: payload
  });

export const getDonationQR = (eventId: string) =>
  apiRequest<DonationQrResponse>(`/finance/${eventId}/donation-qr`);

export const verifyDonation = (donationId: string) =>
  apiRequest<Donation>(`/finance/donation/${donationId}/verify`, {
    method: "PATCH"
  });
