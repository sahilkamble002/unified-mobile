export const colors = {
  primary: "#0c8b83",
  primarySoft: "#dff6f1",
  accent: "#da7b45",
  ink: "#09181d",
  hero: "#112831",
  heroSecondary: "#1c3b46",
  heroBadge: "rgba(255,251,243,0.12)",
  heroBorder: "rgba(255,251,243,0.18)",
  canvas: "#efe8dc",
  card: "#fffdf8",
  cardMuted: "#f5efe5",
  border: "#d5c8b7",
  textHeading: "#173039",
  textBody: "#435a61",
  textSecondary: "#6f7f83",
  muted: "#9cabac",
  railText: "rgba(247, 244, 238, 0.78)",
  white: "#ffffff",
  error: "#bb5a4b",
  errorSoft: "#f7e5e1",
  success: "#2b8766",
  successSoft: "#e3f3ea",
  gold: "#c69b57",
  goldSoft: "#f4ead6"
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
} as const;

export const radius = {
  md: 14,
  lg: 24,
  xl: 32
} as const;

export const shadow = {
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 12
    },
    elevation: 5
  }
} as const;
