"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const env_1 = require("./config/env");
const routes_1 = require("./routes");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL
}));
exports.app.use(express_1.default.json());
exports.app.use("/api", routes_1.router);
exports.app.use((error, _request, response, _next) => {
    if (error instanceof zod_1.ZodError) {
        response.status(400).json({
            message: "Dados invalidos na requisicao.",
            issues: error.issues
        });
        return;
    }
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    response.status(500).json({ message });
});
