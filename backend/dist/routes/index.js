"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const database_1 = require("../data/database");
const authService_1 = require("../services/authService");
const dashboardService_1 = require("../services/dashboardService");
const notificationService_1 = require("../services/notificationService");
const router = (0, express_1.Router)();
exports.router = router;
const optionalTextField = zod_1.z.string().trim().min(1).optional();
const appointmentSchema = zod_1.z
    .object({
    customerId: optionalTextField,
    customerName: optionalTextField,
    customerPhone: optionalTextField,
    customerEmail: optionalTextField,
    petId: optionalTextField,
    petName: optionalTextField,
    petSpecies: optionalTextField,
    petBreed: optionalTextField,
    serviceId: optionalTextField,
    serviceName: optionalTextField,
    serviceDurationMinutes: zod_1.z.number().int().positive().optional(),
    servicePrice: zod_1.z.number().nonnegative().optional(),
    startsAt: zod_1.z.string()
})
    .refine((payload) => Boolean(payload.customerId || payload.customerName), {
    message: "Cliente obrigatorio."
})
    .refine((payload) => Boolean(payload.petId || payload.petName), {
    message: "Pet obrigatorio."
})
    .refine((payload) => Boolean(payload.serviceId || payload.serviceName), {
    message: "Servico obrigatorio."
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.enum(["confirmado", "pendente", "concluido", "cancelado"])
});
const chargePaymentSchema = zod_1.z.object({
    paid: zod_1.z.boolean()
});
const chargeMethodSchema = zod_1.z.object({
    method: zod_1.z.enum(["pix", "cartao", "dinheiro"])
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email(),
    password: zod_1.z.string().min(1)
});
const registerPasswordSchema = zod_1.z
    .string()
    .min(10, "A senha deve ter pelo menos 10 caracteres.")
    .max(128, "A senha deve ter no maximo 128 caracteres.")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula.")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula.")
    .regex(/[0-9]/, "A senha deve conter ao menos um numero.")
    .regex(/[^A-Za-z0-9]/, "A senha deve conter ao menos um caractere especial.")
    .refine((value) => value.trim() === value, {
    message: "A senha nao pode comecar ou terminar com espacos."
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3).max(80),
    email: zod_1.z.string().trim().email().max(160),
    password: registerPasswordSchema
});
function normalizeEmailAddress(email) {
    return email.trim().toLowerCase();
}
function asyncHandler(handler) {
    return (request, response, next) => {
        void handler(request, response, next).catch(next);
    };
}
async function buildAppointmentViews() {
    const repository = (0, database_1.getRepository)();
    const [appointments, customers, pets, services] = await Promise.all([
        repository.getAppointments(),
        repository.getCustomers(),
        repository.getPets(),
        repository.getServices()
    ]);
    return appointments.map((appointment) => ({
        ...appointment,
        customer: customers.find((customer) => customer.id === appointment.customerId),
        pet: pets.find((pet) => pet.id === appointment.petId),
        service: services.find((service) => service.id === appointment.serviceId)
    }));
}
function authenticateRequest(request, response, next) {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        response.status(401).json({ message: "Acesso negado. Faca login para continuar." });
        return;
    }
    const token = authorization.slice("Bearer ".length).trim();
    const authPayload = (0, authService_1.verifyAuthToken)(token);
    if (!authPayload) {
        response.status(401).json({ message: "Sessao expirada. Faca login novamente." });
        return;
    }
    next();
}
router.get("/health", (_request, response) => {
    const repositoryInfo = (0, database_1.getRepositoryInfo)();
    response.json({
        status: "ok",
        databaseProvider: repositoryInfo.activeProvider,
        configuredDatabaseProvider: repositoryInfo.configuredProvider,
        whatsappConfigured: Boolean(env_1.env.WHATSAPP_TOKEN && env_1.env.WHATSAPP_PHONE_ID)
    });
});
router.post("/auth/register", asyncHandler(async (request, response) => {
    const payload = registerSchema.parse(request.body);
    const normalizedEmail = normalizeEmailAddress(payload.email);
    const repository = (0, database_1.getRepository)();
    const existingUser = await repository.getAuthUserByEmail(normalizedEmail);
    if (existingUser) {
        response.status(409).json({ message: "Ja existe uma conta cadastrada com este email." });
        return;
    }
    const { passwordHash, passwordSalt } = await (0, authService_1.hashPassword)(payload.password);
    const user = await repository.createAuthUser({
        name: payload.name.trim().replace(/\s+/g, " "),
        email: normalizedEmail,
        passwordHash,
        passwordSalt,
        role: "admin"
    });
    response.status(201).json({
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        message: "Cadastro realizado com sucesso. Faca login para continuar."
    });
}));
router.post("/auth/login", asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const normalizedEmail = normalizeEmailAddress(payload.email);
    const user = await (0, database_1.getRepository)().getAuthUserByEmail(normalizedEmail);
    if (!user || !(await (0, authService_1.verifyPassword)(payload.password, user.passwordHash, user.passwordSalt))) {
        response.status(401).json({ message: "Email ou senha invalidos." });
        return;
    }
    const session = (0, authService_1.createAuthToken)({
        email: user.email,
        name: user.name,
        role: user.role
    });
    response.json({
        token: session.token,
        email: user.email,
        name: user.name,
        role: user.role,
        expiresAt: session.expiresAt
    });
}));
router.use(authenticateRequest);
router.get("/dashboard", asyncHandler(async (_request, response) => {
    response.json(await (0, dashboardService_1.getDashboardSnapshot)());
}));
router.get("/customers", asyncHandler(async (_request, response) => {
    response.json(await (0, database_1.getRepository)().getCustomers());
}));
router.get("/pets", asyncHandler(async (_request, response) => {
    const repository = (0, database_1.getRepository)();
    const [pets, customers] = await Promise.all([repository.getPets(), repository.getCustomers()]);
    response.json(pets.map((pet) => ({
        ...pet,
        customer: customers.find((customer) => customer.id === pet.customerId)
    })));
}));
router.get("/services", asyncHandler(async (_request, response) => {
    response.json(await (0, database_1.getRepository)().getServices());
}));
router.get("/appointments", asyncHandler(async (_request, response) => {
    response.json(await buildAppointmentViews());
}));
router.post("/appointments", asyncHandler(async (request, response) => {
    const payload = appointmentSchema.parse(request.body);
    const appointment = await (0, database_1.getRepository)().createAppointment(payload);
    response.status(201).json(appointment);
}));
router.delete("/appointments/:id", asyncHandler(async (request, response) => {
    const deleted = await (0, database_1.getRepository)().deleteAppointment(request.params.id);
    if (!deleted) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
}));
router.patch("/appointments/:id/remove-from-queue", asyncHandler(async (request, response) => {
    const hidden = await (0, database_1.getRepository)().removeAppointmentFromQueue(request.params.id);
    if (!hidden) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
}));
router.patch("/appointments/:id/restore-to-queue", asyncHandler(async (request, response) => {
    const restored = await (0, database_1.getRepository)().restoreAppointmentToQueue(request.params.id);
    if (!restored) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
}));
router.patch("/appointments/:id/status", asyncHandler(async (request, response) => {
    const payload = statusSchema.parse(request.body);
    const appointment = await (0, database_1.getRepository)().updateAppointmentStatus(request.params.id, payload.status);
    if (!appointment) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.json(appointment);
}));
router.get("/charges", asyncHandler(async (_request, response) => {
    const repository = (0, database_1.getRepository)();
    const [charges, appointments] = await Promise.all([repository.getCharges(), repository.getAppointments()]);
    response.json(charges.map((charge) => ({
        ...charge,
        appointment: appointments.find((appointment) => appointment.id === charge.appointmentId)
    })));
}));
router.patch("/charges/:id/payment-status", asyncHandler(async (request, response) => {
    const payload = chargePaymentSchema.parse(request.body);
    const charge = await (0, database_1.getRepository)().updateChargePaymentStatus(request.params.id, payload.paid);
    if (!charge) {
        response.status(404).json({ message: "Cobranca nao encontrada." });
        return;
    }
    response.json(charge);
}));
router.patch("/charges/:id/payment-method", asyncHandler(async (request, response) => {
    const payload = chargeMethodSchema.parse(request.body);
    const charge = await (0, database_1.getRepository)().updateChargePaymentMethod(request.params.id, payload.method);
    if (!charge) {
        response.status(404).json({ message: "Cobranca nao encontrada." });
        return;
    }
    response.json(charge);
}));
router.post("/notifications/reminder/:appointmentId", asyncHandler(async (request, response) => {
    const result = await (0, notificationService_1.sendReminder)(request.params.appointmentId);
    response.status(result.ok ? 200 : 404).json(result);
}));
