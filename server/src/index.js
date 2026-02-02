const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { connectDb } = require("./lib/db");
const { authRouter } = require("./routes/auth");
const { habitsRouter } = require("./routes/habits");
const { analyticsRouter } = require("./routes/analytics");

const app = express();

function parseOrigins() {
  // Accept comma-separated list in production (Netlify preview + prod, custom domains, etc.)
  const raw = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "").trim();
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Always allow local dev
  parts.push("http://localhost:5173", "http://localhost:5174");
  return Array.from(new Set(parts));
}

const allowedOrigins = parseOrigins();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / tools without Origin header
      if (!origin) return cb(null, true);

      // Allow any localhost port in dev
      if (origin.startsWith("http://localhost:")) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/analytics", analyticsRouter);

const port = Number(process.env.PORT || 4000);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

