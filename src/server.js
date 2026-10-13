import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config } from "./config.js";
import { registerAnalyticsRoutes } from "./routes/analytics.routes.js";
import { registerFeedbackRoutes } from "./routes/feedback.routes.js";
import { registerImportRoutes } from "./routes/import.routes.js";
import { registerLessonRoutes } from "./routes/lessons.routes.js";
import { registerPageRoutes } from "./routes/page.routes.js";
import { registerPresenceRoutes } from "./routes/presence.routes.js";

const app = express();
const PORT = config.port;
const HOST = config.host;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.set("trust proxy", 1);
registerPageRoutes(app);
registerLessonRoutes(app);
registerPresenceRoutes(app);
registerAnalyticsRoutes(app);
registerFeedbackRoutes(app);
registerImportRoutes(app);

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Lỗi xử lý yêu cầu." });
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, HOST, () => {
    console.log(`Thời khóa biểu: http://${HOST}:${PORT}`);
  });
}

export default app;
