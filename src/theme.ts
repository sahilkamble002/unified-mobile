export const colors = {
  primary: "#1f6e74",
  primarySoft: "#ddf2f3",
  accent: "#f29f67",
  ink: "#0f1b24",
  hero: "#163a45",
  heroSecondary: "#214452",
  heroBadge: "rgba(255,255,255,0.12)",
  heroBorder: "rgba(255,255,255,0.18)",
  canvas: "#f3f5f8",
  card: "#ffffff",
  cardMuted: "#f7fafc",
  border: "#d7dfe8",
  textHeading: "#1d2b36",
  textBody: "#445263",
  textSecondary: "#6b7b8f",
  muted: "#98a6b6",
  railText: "rgba(242, 246, 249, 0.78)",
  white: "#ffffff",
  error: "#c35b5b",
  errorSoft: "#f9e9e9",
  success: "#2e8a65",
  successSoft: "#e5f5ed"
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radius = {
  md: 14,
  lg: 24
} as const;

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10
    },
    elevation: 4
  }
} as const;
