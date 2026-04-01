import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { getRepository, getRepositoryInfo } from "../data/database";
import { createAuthToken, hashPassword, verifyAuthToken, verifyPassword } from "../services/authService";
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

const registerPasswordSchema = z
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

const registerSchema = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(160),
  password: registerPasswordSchema
});

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

function asyncHandler(handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

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

router.post("/auth/register", asyncHandler(async (request, response) => {
  const payload = registerSchema.parse(request.body);
  const normalizedEmail = normalizeEmailAddress(payload.email);
  const repository = getRepository();
  const existingUser = await repository.getAuthUserByEmail(normalizedEmail);

  if (existingUser) {
    response.status(409).json({ message: "Ja existe uma conta cadastrada com este email." });
    return;
  }

  const { passwordHash, passwordSalt } = await hashPassword(payload.password);
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
  const user = await getRepository().getAuthUserByEmail(normalizedEmail);

  if (!user || !(await verifyPassword(payload.password, user.passwordHash, user.passwordSalt))) {
    response.status(401).json({ message: "Email ou senha invalidos." });
    return;
  }

  const session = createAuthToken({
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
  response.json(await getDashboardSnapshot());
}));

router.get("/customers", asyncHandler(async (_request, response) => {
  response.json(await getRepository().getCustomers());
}));

router.get("/pets", asyncHandler(async (_request, response) => {
  const repository = getRepository();
  const [pets, customers] = await Promise.all([repository.getPets(), repository.getCustomers()]);
  response.json(
    pets.map((pet) => ({
      ...pet,
      customer: customers.find((customer) => customer.id === pet.customerId)
    }))
  );
}));

router.get("/services", asyncHandler(async (_request, response) => {
  response.json(await getRepository().getServices());
}));

router.get("/appointments", asyncHandler(async (_request, response) => {
  response.json(await buildAppointmentViews());
}));

router.post("/appointments", asyncHandler(async (request, response) => {
  const payload = appointmentSchema.parse(request.body);
  const appointment = await getRepository().createAppointment(payload);

  response.status(201).json(appointment);
}));

router.delete("/appointments/:id", asyncHandler(async (request, response) => {
  const deleted = await getRepository().deleteAppointment(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
}));

router.patch("/appointments/:id/remove-from-queue", asyncHandler(async (request, response) => {
  const hidden = await getRepository().removeAppointmentFromQueue(request.params.id);

  if (!hidden) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
}));

router.patch("/appointments/:id/restore-to-queue", asyncHandler(async (request, response) => {
  const restored = await getRepository().restoreAppointmentToQueue(request.params.id);

  if (!restored) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.status(204).send();
}));

router.patch("/appointments/:id/status", asyncHandler(async (request, response) => {
  const payload = statusSchema.parse(request.body);
  const appointment = await getRepository().updateAppointmentStatus(request.params.id, payload.status);

  if (!appointment) {
    response.status(404).json({ message: "Agendamento nao encontrado." });
    return;
  }

  response.json(appointment);
}));

router.get("/charges", asyncHandler(async (_request, response) => {
  const repository = getRepository();
  const [charges, appointments] = await Promise.all([repository.getCharges(), repository.getAppointments()]);
  response.json(
    charges.map((charge) => ({
      ...charge,
      appointment: appointments.find((appointment) => appointment.id === charge.appointmentId)
    }))
  );
}));

router.patch("/charges/:id/payment-status", asyncHandler(async (request, response) => {
  const payload = chargePaymentSchema.parse(request.body);
  const charge = await getRepository().updateChargePaymentStatus(request.params.id, payload.paid);

  if (!charge) {
    response.status(404).json({ message: "Cobranca nao encontrada." });
    return;
  }

  response.json(charge);
}));

router.patch("/charges/:id/payment-method", asyncHandler(async (request, response) => {
  const payload = chargeMethodSchema.parse(request.body);
  const charge = await getRepository().updateChargePaymentMethod(request.params.id, payload.method);

  if (!charge) {
    response.status(404).json({ message: "Cobranca nao encontrada." });
    return;
  }

  response.json(charge);
}));

router.post("/notifications/reminder/:appointmentId", asyncHandler(async (request, response) => {
  const result = await sendReminder(request.params.appointmentId);
  response.status(result.ok ? 200 : 404).json(result);
}));

export { router };
