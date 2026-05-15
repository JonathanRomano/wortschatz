import { getTranslations } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { ButtonLink } from "@/components/ui/ButtonLink";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const tc = await getTranslations("common");
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, sm: 12 }, textAlign: "center" }}>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: "5rem", sm: "6rem" },
          color: "primary.main",
          letterSpacing: "-0.02em",
        }}
      >
        {t("title")}
      </Typography>
      <Typography
        variant="body1"
        sx={{ mt: 2, color: "text.secondary", fontSize: { xs: "1rem", sm: "1.125rem" } }}
      >
        {t("message")}
      </Typography>
      <Box sx={{ mt: 4 }}>
        <ButtonLink href="/" variant="contained" color="primary">
          {tc("home")}
        </ButtonLink>
      </Box>
    </Container>
  );
}
