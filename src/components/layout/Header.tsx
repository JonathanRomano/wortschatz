import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations("nav");
  const session = await auth();
  const isAuthed = !!session?.user;
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "TEACHER";

  // Pull live Münzen/streak for the header chip. Cheap, indexed by id.
  const wallet =
    isAuthed && session.user.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { muenzen: true, streak: true },
        })
      : null;

  const authedLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/exercises", label: t("exercises") },
    { href: "/exercises/mistakes", label: t("mistakes") },
    { href: "/review", label: t("review") },
    { href: "/profile", label: t("profile") },
    ...(isAdmin ? [{ href: "/admin", label: t("admin") }] : []),
  ];

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-all hover:-translate-y-px hover:bg-muted sm:w-auto"
      >
        {t("logout")}
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight sm:text-xl"
        >
          <Wordmark />
        </Link>

        {/* Desktop nav (md+) */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {isAuthed ? (
            <>
              {wallet ? (
                <div className="mr-2 flex items-center gap-2">
                  <MuenzenBadge amount={wallet.muenzen} size="sm" />
                  <StreakFlame days={wallet.streak} size="sm" />
                </div>
              ) : null}
              {authedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <div className="ml-2">{signOutForm}</div>
              <div className="ml-2">
                <LocaleSwitcher />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-primary"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="ml-1 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow"
              >
                {t("register")}
              </Link>
              <div className="ml-2">
                <LocaleSwitcher />
              </div>
            </>
          )}
        </nav>

        {/* Mobile compact rail (below md): wallet chips next to the menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthed && wallet ? (
            <>
              <MuenzenBadge amount={wallet.muenzen} size="sm" />
              <StreakFlame days={wallet.streak} size="sm" />
            </>
          ) : null}
          <MobileMenu
            isAuthed={isAuthed}
            labels={{
              openMenu: t("openMenu"),
              closeMenu: t("closeMenu"),
              menu: t("menu"),
              login: t("login"),
              register: t("register"),
              language: t("language"),
            }}
            links={authedLinks}
            signOutSlot={isAuthed ? signOutForm : null}
          />
        </div>
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-primary">Wortschatz</span>
      <span
        aria-hidden="true"
        className="hidden h-1.5 w-1.5 rounded-full bg-accent sm:block"
      />
    </span>
  );
}
