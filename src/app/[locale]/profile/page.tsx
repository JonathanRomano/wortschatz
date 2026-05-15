import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const t = await getTranslations("profile");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, preferredLanguage: true },
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <Card className="mt-6" padding="lg">
        <ProfileForm
          name={user.name ?? ""}
          email={user.email}
          preferredLanguage={user.preferredLanguage}
        />
      </Card>
    </div>
  );
}
