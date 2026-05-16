import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export async function Footer() {
  const t = await getTranslations("footer");
  const tApp = await getTranslations("app");
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        backgroundColor: "surfaceAlt.main",
        color: "text.secondary",
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            py: { xs: 3, sm: 4 },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="body1"
            sx={{ color: "text.primary", fontFamily: "var(--font-fraunces), serif" }}
          >
            {tApp("name")}
            <Box
              component="span"
              aria-hidden="true"
              sx={{ mx: 1.25, color: "secondary.main" }}
            >
              ·
            </Box>
            <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
              {tApp("tagline")}
            </Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", textWrap: "balance" }}
          >
            © {new Date().getFullYear()} · {t("madeWith")}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
