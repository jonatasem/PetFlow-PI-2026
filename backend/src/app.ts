import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { env } from "./config/env";
import { router } from "./routes";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL
  })
);
app.use(express.json());
app.use("/api", router);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Dados invalidos na requisicao.",
      issues: error.issues
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Erro interno do servidor.";
  response.status(500).json({ message });
});
