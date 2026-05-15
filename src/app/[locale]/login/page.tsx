import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("loginTitle")}
      </h1>
      <Card className="mt-6" padding="lg">
        <LoginForm />
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("submitRegister")}
        </Link>
      </p>
    </div>
  );
}
