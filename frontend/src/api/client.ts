import { getStoredAuthSession } from "../auth/session";
import type { Appointment, AuthSession, Charge, Customer, DashboardData, LoginCredentials, Pet, RegisterCredentials, RegisterResponse, ServiceItem } from "../types";

export interface CreateAppointmentPayload {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  petId?: string;
  petName?: string;
  petSpecies?: string;
  petBreed?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  startsAt: string;
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getStoredAuthSession();
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers,
    ...init
  });

  if (!response.ok) {
    let message = "Falha ao carregar os dados da API.";

    try {
      const body = await response.json() as { message?: string };
      message = body.message ?? message;
    } catch {
      // Ignora corpos vazios ou respostas nao JSON.
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(payload: LoginCredentials) {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function register(payload: RegisterCredentials) {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export function getAppointments() {
  return request<Appointment[]>("/appointments");
}

export function getCustomers() {
  return request<Customer[]>("/customers");
}

export function getCharges() {
  return request<Charge[]>("/charges");
}

export function getPets() {
  return request<Pet[]>("/pets");
}

export function getServices() {
  return request<ServiceItem[]>("/services");
}

export function createAppointment(payload: CreateAppointmentPayload) {
  return request<Appointment>("/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteAppointment(appointmentId: string) {
  await request<undefined>(`/appointments/${appointmentId}`, {
    method: "DELETE"
  });
}

export async function removeAppointmentFromQueue(appointmentId: string) {
  await request<undefined>(`/appointments/${appointmentId}/remove-from-queue`, {
    method: "PATCH"
  });
}

export async function restoreAppointmentToQueue(appointmentId: string) {
  await request<undefined>(`/appointments/${appointmentId}/restore-to-queue`, {
    method: "PATCH"
  });
}

export function updateAppointmentStatus(appointmentId: string, status: Appointment["status"]) {
  return request<Appointment>(`/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function sendReminder(appointmentId: string) {
  return request<{ ok: boolean; mode: string }>(`/notifications/reminder/${appointmentId}`, {
    method: "POST"
  });
}

export function updateChargePaymentStatus(chargeId: string, paid: boolean) {
  return request<Charge>(`/charges/${chargeId}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ paid })
  });
}

export function updateChargePaymentMethod(chargeId: string, method: Charge["method"]) {
  return request<Charge>(`/charges/${chargeId}/payment-method`, {
    method: "PATCH",
    body: JSON.stringify({ method })
  });
}
