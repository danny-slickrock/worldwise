// Worldwise design tokens — premium, map-first, timeless.
export const colors = {
  navy: "#1F3A5F",
  navyDeep: "#16293F",
  teal: "#2E6E7E",
  earth: "#9C6B3C",
  sand: "#C9A66B",
  bg: "#F7F4EE", // warm off-white
  surface: "#FFFFFF",
  surfaceAlt: "#EEF2F5",
  ink: "#20242B",
  muted: "#5A6470",
  line: "#DCE3E8",
  success: "#2F8F5B",
  successBg: "#E4F3EA",
  error: "#C0492F",
  errorBg: "#F7E6E1",
  white: "#FFFFFF",
};

export const spacing = (n) => n * 8;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const type = {
  hero: { fontSize: 34, fontWeight: "800", color: colors.navy, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  h2: { fontSize: 18, fontWeight: "700", color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  pill: { fontSize: 13, fontWeight: "700" },
};

export const shadow = {
  shadowColor: "#1F3A5F",
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
