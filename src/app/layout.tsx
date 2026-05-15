import "./globals.css";

export const metadata = {
  title: "Wortschatz",
  description: "Build your German vocabulary, one Wort at a time.",
};

// The root layout is intentionally minimal — locale-aware HTML lives in
// src/app/[locale]/layout.tsx so next-intl can set <html lang> correctly.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
