import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.string().default("development"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  ADMIN_NAME: z.string().default("Gestor Brisa Pet"),
  ADMIN_EMAIL: z.string().email().default("admin@brisapet.com"),
  ADMIN_PASSWORD: z.string().min(6).default("petshop123"),
  AUTH_SECRET: z.string().min(16).default("brisa-pet-auth-secret-2026"),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(12),
  DATABASE_PROVIDER: z.enum(["memory", "mysql", "mongodb", "firebase"]).default("memory"),
  MYSQL_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  WHATSAPP_API_URL: z.string().default("https://graph.facebook.com/v21.0"),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional()
});

export const env = envSchema.parse(process.env);
