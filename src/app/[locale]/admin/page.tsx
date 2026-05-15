import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { AdminExerciseRow } from "./AdminExerciseRow";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("admin");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Card padding="lg" className="text-center">
          <p className="text-base text-muted-foreground">{t("noPermission")}</p>
        </Card>
      </div>
    );
  }

  const [exercises, users] = await Promise.all([
    prisma.exercise.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        type: true,
        level: true,
        status: true,
        createdAt: true,
      },
    }),
    role === "ADMIN"
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, email: true, name: true, role: true, muenzen: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">
          {t("exercises")}
        </h2>
        <Card className="mt-3" padding="sm">
          <ul className="divide-y divide-border">
            {exercises.map((ex) => (
              <AdminExerciseRow
                key={ex.id}
                id={ex.id}
                title={ex.title}
                type={ex.type}
                level={ex.level}
                status={ex.status}
              />
            ))}
          </ul>
        </Card>
      </section>

      {role === "ADMIN" ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {t("users")}
          </h2>

          {/* Card list — mobile + tablet */}
          <ul className="mt-3 grid gap-3 lg:hidden">
            {users.map((u) => (
              <Card key={u.id} padding="md">
                <p className="break-all font-medium">{u.email}</p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="mt-0.5 break-words">{u.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="mt-0.5">{u.role}</dd>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <dt className="text-muted-foreground">Münzen</dt>
                    <dd className="mt-0.5">
                      <MuenzenBadge amount={u.muenzen} size="sm" />
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </ul>

          {/* Table — desktop only */}
          <Card className="mt-3 hidden overflow-hidden p-0 lg:block" padding="sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 text-right font-medium">Münzen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="break-all px-4 py-2.5">{u.email}</td>
                      <td className="px-4 py-2.5">{u.name ?? "—"}</td>
                      <td className="px-4 py-2.5">{u.role}</td>
                      <td className="px-4 py-2.5 text-right">
                        <MuenzenBadge amount={u.muenzen} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
