import { once } from "node:events";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../app";
import { resetMockDb } from "../data/mockDb";

let server: Server;
let baseUrl: string;
let authHeaders: HeadersInit;

beforeEach(async () => {
  resetMockDb();
  server = app.listen(0);
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  const loginResponse = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "admin@brisapet.com",
      password: "petshop123"
    })
  });

  authHeaders = {
    Authorization: `Bearer ${loginResponse.body.token}`
  };
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

function withAuthHeaders(headers?: HeadersInit) {
  return {
    ...authHeaders,
    ...headers
  };
}

async function protectedRequest(path: string, init?: RequestInit) {
  return request(path, {
    ...init,
    headers: withAuthHeaders(init?.headers)
  });
}

describe("API", () => {
  it("retorna health com provider ativo", async () => {
    const { response, body } = await request("/health");

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.databaseProvider, "memory");
  });

  it("realiza login com as credenciais demo", async () => {
    const { response, body } = await request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "admin@brisapet.com",
        password: "petshop123"
      })
    });

    assert.equal(response.status, 200);
    assert.equal(body.email, "admin@brisapet.com");
    assert.equal(body.name, "Gestor Brisa Pet");
    assert.equal(body.role, "admin");
    assert.ok(body.token);
  });

  it("bloqueia login com credenciais invalidas", async () => {
    const { response, body } = await request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "admin@brisapet.com",
        password: "senha-errada"
      })
    });

    assert.equal(response.status, 401);
    assert.equal(body.message, "Email ou senha invalidos.");
  });

  it("bloqueia acesso sem bearer token valido", async () => {
    const { response, body } = await request("/dashboard");

    assert.equal(response.status, 401);
    assert.equal(body.message, "Acesso negado. Faca login para continuar.");
  });

  it("retorna dashboard com metricas esperadas", async () => {
    const { response, body } = await protectedRequest("/dashboard");

    assert.equal(response.status, 200);
    assert.deepEqual(body.metrics, {
      clients: 3,
      pets: 3,
      services: 9,
      todayAppointments: 3,
      confirmedAppointments: 2,
      pendingReceivables: 115,
      monthlyRevenue: 95
    });
    assert.equal(body.todayAppointments.length, 3);
    assert.equal(body.pendingCharges.length, 2);
  });

  it("retorna rotas de listagem com relacoes esperadas", async () => {
    const [customers, pets, services, appointments, charges] = await Promise.all([
      protectedRequest("/customers"),
      protectedRequest("/pets"),
      protectedRequest("/services"),
      protectedRequest("/appointments"),
      protectedRequest("/charges")
    ]);

    assert.equal(customers.response.status, 200);
    assert.equal(customers.body.length, 3);

    assert.equal(pets.response.status, 200);
    assert.equal(pets.body.length, 3);
    assert.ok(pets.body.every((item: { customer?: { id: string } }) => item.customer?.id));

    assert.equal(services.response.status, 200);
    assert.equal(services.body.length, 9);

    assert.equal(appointments.response.status, 200);
    assert.equal(appointments.body.length, 3);
    assert.ok(appointments.body.every((item: { customer?: { id: string }; pet?: { id: string }; service?: { id: string } }) => item.customer?.id && item.pet?.id && item.service?.id));

    assert.equal(charges.response.status, 200);
    assert.equal(charges.body.length, 3);
    assert.ok(charges.body.every((item: { appointment?: { id: string } }) => item.appointment?.id));
  });

  it("cria agendamento, atualiza status e envia lembrete", async () => {
    const created = await protectedRequest("/appointments", {
      method: "POST",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        customerId: "c1",
        petId: "p1",
        serviceId: "s1",
        startsAt: "2026-03-28T10:00:00.000Z"
      })
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.status, "pendente");
    assert.equal(created.body.reminderSent, false);

    const updated = await protectedRequest(`/appointments/${created.body.id}/status`, {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ status: "confirmado" })
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.status, "confirmado");

    const reminder = await protectedRequest(`/notifications/reminder/${created.body.id}`, {
      method: "POST"
    });

    assert.equal(reminder.response.status, 200);
    assert.equal(reminder.body.ok, true);
    assert.equal(reminder.body.mode, "simulation");

    const appointmentsResponse = await protectedRequest("/appointments");
    const savedAppointment = appointmentsResponse.body.find((item: { id: string; reminderSent: boolean }) => item.id === created.body.id);

    assert.ok(savedAppointment);
    assert.equal(savedAppointment.reminderSent, true);
  });

  it("retira atendimento da fila sem apagar o cadastro", async () => {
    const removed = await protectedRequest("/appointments/a2/remove-from-queue", {
      method: "PATCH"
    });

    assert.equal(removed.response.status, 204);

    const dashboard = await protectedRequest("/dashboard");
    assert.equal(dashboard.body.todayAppointments.length, 2);
    assert.ok(!dashboard.body.todayAppointments.some((item: { id: string }) => item.id === "a2"));

    const appointments = await protectedRequest("/appointments");
    const hiddenAppointment = appointments.body.find((item: { id: string; hiddenFromQueue: boolean }) => item.id === "a2");

    assert.ok(hiddenAppointment);
    assert.equal(hiddenAppointment.hiddenFromQueue, true);

    const restored = await protectedRequest("/appointments/a2/restore-to-queue", {
      method: "PATCH"
    });

    assert.equal(restored.response.status, 204);

    const restoredDashboard = await protectedRequest("/dashboard");
    assert.equal(restoredDashboard.body.todayAppointments.length, 3);
  });

  it("exclui definitivamente atendimento fora da fila", async () => {
    const removed = await protectedRequest("/appointments/a2/remove-from-queue", {
      method: "PATCH"
    });

    assert.equal(removed.response.status, 204);

    const deleted = await protectedRequest("/appointments/a2", {
      method: "DELETE"
    });

    assert.equal(deleted.response.status, 204);

    const appointments = await protectedRequest("/appointments");
    assert.ok(!appointments.body.some((item: { id: string }) => item.id === "a2"));

    const dashboard = await protectedRequest("/dashboard");
    assert.equal(dashboard.body.pendingCharges.length, 1);
  });

  it("atualiza cobranca para paga e nao paga novamente", async () => {
    const paid = await protectedRequest("/charges/ch2/payment-status", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ paid: true })
    });

    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.paid, true);

    const dashboardAfterPaid = await protectedRequest("/dashboard");
    assert.equal(dashboardAfterPaid.body.pendingCharges.length, 1);

    const unpaid = await protectedRequest("/charges/ch2/payment-status", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ paid: false })
    });

    assert.equal(unpaid.response.status, 200);
    assert.equal(unpaid.body.paid, false);

    const dashboardAfterUnpaid = await protectedRequest("/dashboard");
    assert.equal(dashboardAfterUnpaid.body.pendingCharges.length, 2);
  });

  it("atualiza metodo de pagamento da cobranca", async () => {
    const updated = await protectedRequest("/charges/ch2/payment-method", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ method: "cartao" })
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.method, "cartao");

    const charges = await protectedRequest("/charges");
    const updatedCharge = charges.body.find((item: { id: string; method: string }) => item.id === "ch2");

    assert.ok(updatedCharge);
    assert.equal(updatedCharge.method, "cartao");
  });

  it("retorna 404 ao atualizar cobranca inexistente", async () => {
    const { response, body } = await protectedRequest("/charges/inexistente/payment-status", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ paid: true })
    });

    assert.equal(response.status, 404);
    assert.equal(body.message, "Cobranca nao encontrada.");
  });

  it("retorna 404 ao atualizar metodo de cobranca inexistente", async () => {
    const { response, body } = await protectedRequest("/charges/inexistente/payment-method", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ method: "pix" })
    });

    assert.equal(response.status, 404);
    assert.equal(body.message, "Cobranca nao encontrada.");
  });

  it("retorna 400 para payload invalido", async () => {
    const { response, body } = await protectedRequest("/appointments", {
      method: "POST",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        customerId: "c1"
      })
    });

    assert.equal(response.status, 400);
    assert.equal(body.message, "Dados invalidos na requisicao.");
    assert.ok(Array.isArray(body.issues));
  });

  it("retorna 404 ao atualizar agendamento inexistente", async () => {
    const { response, body } = await protectedRequest("/appointments/inexistente/status", {
      method: "PATCH",
      headers: withAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ status: "confirmado" })
    });

    assert.equal(response.status, 404);
    assert.equal(body.message, "Agendamento nao encontrado.");
  });
});