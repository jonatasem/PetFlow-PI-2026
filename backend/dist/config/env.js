"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3333),
    NODE_ENV: zod_1.z.string().default("development"),
    CLIENT_URL: zod_1.z.string().default("http://localhost:5173"),
    ADMIN_NAME: zod_1.z.string().default("Gestor Brisa Pet"),
    ADMIN_EMAIL: zod_1.z.string().email().default("admin@brisapet.com"),
    ADMIN_PASSWORD: zod_1.z.string().min(6).default("petshop123"),
    AUTH_SECRET: zod_1.z.string().min(16).default("brisa-pet-auth-secret-2026"),
    AUTH_TOKEN_TTL_HOURS: zod_1.z.coerce.number().int().positive().default(12),
    DATABASE_PROVIDER: zod_1.z.enum(["memory", "mysql", "mongodb", "firebase"]).default("memory"),
    MYSQL_URL: zod_1.z.string().optional(),
    MONGODB_URI: zod_1.z.string().optional(),
    FIREBASE_PROJECT_ID: zod_1.z.string().optional(),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().optional(),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().optional(),
    WHATSAPP_API_URL: zod_1.z.string().default("https://graph.facebook.com/v21.0"),
    WHATSAPP_TOKEN: zod_1.z.string().optional(),
    WHATSAPP_PHONE_ID: zod_1.z.string().optional()
});
exports.env = envSchema.parse(process.env);
