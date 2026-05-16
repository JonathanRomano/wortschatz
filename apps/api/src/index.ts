/**
 * apps/api boot. Validates env, mounts middleware in order
 * (helmet → cors → json body → request log → routes → error handler)
 * and starts listening.
 *
 * Kept ESM-native (package.json has `"type": "module"`) so the same
 * imports work whether run via `tsx watch` in dev or `node dist/index.js`
 * after `tsc` build.
 */
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { aiRouter } from "./routes/ai.js";
import { healthRouter } from "./routes/health.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.use("/health", healthRouter);
app.use("/ai", aiRouter);

// Express 4 keeps an error-handler signature with 4 args.
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
});
