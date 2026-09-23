import "dotenv/config";
import express from "express";
import cors from "cors";

import sessionRoutes from "./routes/session";
import profileRoutes from "./routes/profile";
import poolRoutes from "./routes/pool";
import swipeRoutes from "./routes/swipe";
import ratingRoutes from "./routes/rating";
import historyRoutes from "./routes/history";

const app = express();

app.use(cors()); // dev only — all origins allowed
app.use(express.json());

app.use("/api", sessionRoutes);
app.use("/api", profileRoutes);
app.use("/api", poolRoutes);
app.use("/api", swipeRoutes);
app.use("/api", ratingRoutes);
app.use("/api", historyRoutes);

// Fallback error handler so a thrown/rejected error in a route never crashes
// the process — it always comes back as the contract's { error } shape.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Movie Match server listening on http://0.0.0.0:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "Claude features running in deterministic fallback mode — set ANTHROPIC_API_KEY to enable."
    );
  }
  if (!process.env.TMDB_API_KEY) {
    console.warn("TMDB_API_KEY is not set — pool generation will fail until configured.");
  }
  if (!process.env.RAPIDAPI_KEY) {
    console.warn("RAPIDAPI_KEY is not set — matches will reveal with no OTT platforms listed.");
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
