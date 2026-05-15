import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
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
        {t("registerTitle")}
      </h1>
      <Card className="mt-6" padding="lg">
        <RegisterForm />
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("submitLogin")}
        </Link>
      </p>
    </div>
  );
}
