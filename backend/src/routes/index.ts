import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { getRepository, getRepositoryInfo } from "../data/database";
import { createAuthToken, verifyAuthToken } from "../services/authService";
import { getDashboardSnapshot } from "../services/dashboardService";
import { sendReminder } from "../services/notificationService";

const router = Router();

const optionalTextField = z.string().trim().min(1).optional();

const appointmentSchema = z
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
    serviceDurationMinutes: z.number().int().positive().optional(),
    servicePrice: z.number().nonnegative().optional(),
    startsAt: z.string()
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

const statusSchema = z.object({
  status: z.enum(["confirmado", "pendente", "concluido", "cancelado"])
});

const chargePaymentSchema = z.object({
  paid: z.boolean()
});

const chargeMethodSchema = z.object({
  method: z.enum(["pix", "cartao", "dinheiro"])
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

async function buildAppointmentViews() {
  const repository = getRepository();
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

function authenticateRequest(request: Request, response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Acesso negado. Faca login para continuar." });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const authPayload = verifyAuthToken(token);

  if (!authPayload) {
    response.status(401).json({ message: "Sessao expirada. Faca login novamente." });
    return;
  }

  next();
}

router.get("/health", (_request, response) => {
  const repositoryInfo = getRepositoryInfo();
  response.json({
    status: "ok",
    databaseProvider: repositoryInfo.activeProvider,
    configuredDatabaseProvider: repositoryInfo.configuredProvider,
    whatsappConfigured: Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID)
  });
});

router.post("/auth/login", (request, response) => {
  const payload = loginSchema.parse(request.body);
  const normalizedEmail = payload.email.toLowerCase();

  if (normalizedEmail !== env.ADMIN_EMAIL.toLowerCase() || payload.password !== env.ADMIN_PASSWORD) {
    response.status(401).json({ message: "Email ou senha invalidos." });
    return;
  }

  const session = createAuthToken({
    email: env.ADMIN_EMAIL,
    name: env.ADMIN_NAME,
    role: "admin"
  });

  response.json({
    token: session.token,
    email: env.ADMIN_EMAIL,
    name: env.ADMIN_NAME,
    role: "admin",
    expiresAt: session.expiresAt
  });
});

router.use(authenticateRequest);

router.get("/dashboard", async (_request, response) => {
  response.json(await getDashboardSnapshot());
});

router.get("/customers", async (_request, response) => {
  response.json(await getRepository().getCustomers());
});

router.get("/pets", async (_request, response) => {
  const repository = getRepository();
  const [pets, customers] = await Promise.all([repository.getPets(), repository.getCustomers()]);
  response.json(
    pets.map((pet) => ({
      ...pet,
      customer: customers.find((customer) => customer.id === pet.customerId)
    }))
  );
});

router.get("/services", async (_request, response) => {
  response.json(await getRepository().getServices());
});

router.get("/appointments", async (_request, response) => {
  response.json(await buildAppointmentViews());
});

router.post("/appointments", async (request, response) => {
  const payload = appointmentSchema.parse(request.body);
  const appointment = await getRepository().createAppointment(payload);

  response.status(201).json(appointment);
});

router.delete("/appointments/:id", async (request, response) => {
  const deleted = await getRepository().deleteAppointment(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
});

router.patch("/appointments/:id/remove-from-queue", async (request, response) => {
  const hidden = await getRepository().removeAppointmentFromQueue(request.params.id);

  if (!hidden) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
});

router.patch("/appointments/:id/restore-to-queue", async (request, response) => {
  const restored = await getRepository().restoreAppointmentToQueue(request.params.id);

  if (!restored) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
});

router.patch("/appointments/:id/status", async (request, response) => {
  const payload = statusSchema.parse(request.body);
  const appointment = await getRepository().updateAppointmentStatus(request.params.id, payload.status);

  if (!appointment) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.json(appointment);
});

router.get("/charges", async (_request, response) => {
  const repository = getRepository();
  const [charges, appointments] = await Promise.all([repository.getCharges(), repository.getAppointments()]);
  response.json(
    charges.map((charge) => ({
      ...charge,
      appointment: appointments.find((appointment) => appointment.id === charge.appointmentId)
    }))
  );
});

router.patch("/charges/:id/payment-status", async (request, response) => {
  const payload = chargePaymentSchema.parse(request.body);
  const charge = await getRepository().updateChargePaymentStatus(request.params.id, payload.paid);

  if (!charge) {
    response.status(404).json({ message: "Cobranca nao encontrada." });
    return;
  }

  response.json(charge);
});

router.patch("/charges/:id/payment-method", async (request, response) => {
  const payload = chargeMethodSchema.parse(request.body);
  const charge = await getRepository().updateChargePaymentMethod(request.params.id, payload.method);

  if (!charge) {
    response.status(404).json({ message: "Cobranca nao encontrada." });
    return;
  }

  response.json(charge);
});

router.post("/notifications/reminder/:appointmentId", async (request, response) => {
  const result = await sendReminder(request.params.appointmentId);
  response.status(result.ok ? 200 : 404).json(result);
});

export { router };
