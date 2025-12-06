import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";

const app = express();
const PORT = process.env.PORT || 4000;

// CORS
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// JSON + URL Encoded parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test endpoint
app.get("/", (_req, res) => res.json({ status: "ok" }));

// PUBLIC ROUTES (no auth)
app.use("/auth", authRoutes);

// PROTECTED ROUTES (auth inside tasks routes)
app.use("/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
