import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import * as React from "react";

// next-intl: useTranslations / useLocale return passthrough values so
// tests don't need real message catalogs. Server-side getTranslations is
// also stubbed for the rare case a server component is rendered.
vi.mock("next-intl", () => {
  const translator = (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key;
  return {
    useTranslations: (namespace?: string) => translator(namespace),
    useLocale: () => "en",
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

vi.mock("next-intl/server", () => {
  const translator = (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key;
  return {
    getTranslations: async (namespace?: string) => translator(namespace),
    getLocale: async () => "en",
    getMessages: async () => ({}),
    setRequestLocale: () => undefined,
  };
});

// next-intl typed navigation helpers — replace with simple stand-ins.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
  } & Record<string, unknown>) =>
    React.createElement("a", { href, ...rest }, children),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  redirect: vi.fn(),
  getPathname: ({ href }: { href: string }) => href,
}));

// next/navigation occasionally gets pulled in transitively.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
