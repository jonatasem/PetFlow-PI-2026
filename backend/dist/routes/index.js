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
router.post("/auth/login", (request, response) => {
    const payload = loginSchema.parse(request.body);
    const normalizedEmail = payload.email.toLowerCase();
    if (normalizedEmail !== env_1.env.ADMIN_EMAIL.toLowerCase() || payload.password !== env_1.env.ADMIN_PASSWORD) {
        response.status(401).json({ message: "Email ou senha invalidos." });
        return;
    }
    const session = (0, authService_1.createAuthToken)({
        email: env_1.env.ADMIN_EMAIL,
        name: env_1.env.ADMIN_NAME,
        role: "admin"
    });
    response.json({
        token: session.token,
        email: env_1.env.ADMIN_EMAIL,
        name: env_1.env.ADMIN_NAME,
        role: "admin",
        expiresAt: session.expiresAt
    });
});
router.use(authenticateRequest);
router.get("/dashboard", async (_request, response) => {
    response.json(await (0, dashboardService_1.getDashboardSnapshot)());
});
router.get("/customers", async (_request, response) => {
    response.json(await (0, database_1.getRepository)().getCustomers());
});
router.get("/pets", async (_request, response) => {
    const repository = (0, database_1.getRepository)();
    const [pets, customers] = await Promise.all([repository.getPets(), repository.getCustomers()]);
    response.json(pets.map((pet) => ({
        ...pet,
        customer: customers.find((customer) => customer.id === pet.customerId)
    })));
});
router.get("/services", async (_request, response) => {
    response.json(await (0, database_1.getRepository)().getServices());
});
router.get("/appointments", async (_request, response) => {
    response.json(await buildAppointmentViews());
});
router.post("/appointments", async (request, response) => {
    const payload = appointmentSchema.parse(request.body);
    const appointment = await (0, database_1.getRepository)().createAppointment(payload);
    response.status(201).json(appointment);
});
router.delete("/appointments/:id", async (request, response) => {
    const deleted = await (0, database_1.getRepository)().deleteAppointment(request.params.id);
    if (!deleted) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
});
router.patch("/appointments/:id/remove-from-queue", async (request, response) => {
    const hidden = await (0, database_1.getRepository)().removeAppointmentFromQueue(request.params.id);
    if (!hidden) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
});
router.patch("/appointments/:id/restore-to-queue", async (request, response) => {
    const restored = await (0, database_1.getRepository)().restoreAppointmentToQueue(request.params.id);
    if (!restored) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.status(204).send();
});
router.patch("/appointments/:id/status", async (request, response) => {
    const payload = statusSchema.parse(request.body);
    const appointment = await (0, database_1.getRepository)().updateAppointmentStatus(request.params.id, payload.status);
    if (!appointment) {
        response.status(404).json({ message: "Agendamento nao encontrado." });
        return;
    }
    response.json(appointment);
});
router.get("/charges", async (_request, response) => {
    const repository = (0, database_1.getRepository)();
    const [charges, appointments] = await Promise.all([repository.getCharges(), repository.getAppointments()]);
    response.json(charges.map((charge) => ({
        ...charge,
        appointment: appointments.find((appointment) => appointment.id === charge.appointmentId)
    })));
});
router.patch("/charges/:id/payment-status", async (request, response) => {
    const payload = chargePaymentSchema.parse(request.body);
    const charge = await (0, database_1.getRepository)().updateChargePaymentStatus(request.params.id, payload.paid);
    if (!charge) {
        response.status(404).json({ message: "Cobranca nao encontrada." });
        return;
    }
    response.json(charge);
});
router.patch("/charges/:id/payment-method", async (request, response) => {
    const payload = chargeMethodSchema.parse(request.body);
    const charge = await (0, database_1.getRepository)().updateChargePaymentMethod(request.params.id, payload.method);
    if (!charge) {
        response.status(404).json({ message: "Cobranca nao encontrada." });
        return;
    }
    response.json(charge);
});
router.post("/notifications/reminder/:appointmentId", async (request, response) => {
    const result = await (0, notificationService_1.sendReminder)(request.params.appointmentId);
    response.status(result.ok ? 200 : 404).json(result);
});
