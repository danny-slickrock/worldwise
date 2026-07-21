// Worldwise design tokens — premium, map-first, timeless.
export const colors = {
  navy: "#1F3A5F",
  navyDeep: "#16293F",
  teal: "#2E6E7E",
  // Darkened from #9C6B3C (M2.2 polish + a11y pass): the lighter earth failed
  // WCAG AA (4.5:1) as small kicker/label text on `bg`. This still reads as
  // earth, just dark enough to pass everywhere it's used.
  earth: "#8C6036",
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

// WCAG contrast ratio between two hex colors — pure, no RN/DOM, so it's
// testable in test/engine.test.js and doubles as a guard against future
// token changes silently breaking text contrast.
function relativeLuminance(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}
