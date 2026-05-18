"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_events_1 = require("node:events");
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const app_1 = require("../app");
const mockDb_1 = require("../data/mockDb");
let server;
let baseUrl;
let authHeaders;
const defaultUser = {
    name: "PetFlow Admin",
    email: "admin@petflow.com",
    password: "PetFlow@2026"
};
(0, node_test_1.beforeEach)(async () => {
    (0, mockDb_1.resetMockDb)();
    server = app_1.app.listen(0);
    await (0, node_events_1.once)(server, "listening");
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    await request("/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(defaultUser)
    });
    const loginResponse = await request("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: defaultUser.email,
            password: defaultUser.password
        })
    });
    authHeaders = {
        Authorization: `Bearer ${loginResponse.body.token}`
    };
});
(0, node_test_1.afterEach)(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
});
async function request(path, init) {
    const response = await fetch(`${baseUrl}${path}`, init);
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
}
function withAuthHeaders(headers) {
    return {
        ...authHeaders,
        ...headers
    };
}
async function protectedRequest(path, init) {
    return request(path, {
        ...init,
        headers: withAuthHeaders(init?.headers)
    });
}
(0, node_test_1.describe)("API", () => {
    (0, node_test_1.it)("retorna health com provider ativo", async () => {
        const { response, body } = await request("/health");
        strict_1.default.equal(response.status, 200);
        strict_1.default.equal(body.status, "ok");
        strict_1.default.equal(body.databaseProvider, "memory");
    });
    (0, node_test_1.it)("cadastra uma nova conta com senha forte", async () => {
        const { response, body } = await request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "Maria Gestora",
                email: "maria@petflow.com",
                password: "Maria@2026Segura"
            })
        });
        strict_1.default.equal(response.status, 201);
        strict_1.default.equal(body.email, "maria@petflow.com");
        strict_1.default.equal(body.name, "Maria Gestora");
        strict_1.default.equal(body.role, "admin");
    });
    (0, node_test_1.it)("bloqueia cadastro com email ja utilizado", async () => {
        const { response, body } = await request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(defaultUser)
        });
        strict_1.default.equal(response.status, 409);
        strict_1.default.equal(body.message, "Ja existe uma conta cadastrada com este email.");
    });
    (0, node_test_1.it)("bloqueia cadastro com senha fraca", async () => {
        const { response, body } = await request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "Joao Fraco",
                email: "joao@petflow.com",
                password: "123456"
            })
        });
        strict_1.default.equal(response.status, 400);
        strict_1.default.equal(body.message, "Dados invalidos na requisicao.");
        strict_1.default.ok(Array.isArray(body.issues));
    });
    (0, node_test_1.it)("realiza login com usuario cadastrado", async () => {
        const { response, body } = await request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: defaultUser.email,
                password: defaultUser.password
            })
        });
        strict_1.default.equal(response.status, 200);
        strict_1.default.equal(body.email, defaultUser.email);
        strict_1.default.equal(body.name, defaultUser.name);
        strict_1.default.equal(body.role, "admin");
        strict_1.default.ok(body.token);
    });
    (0, node_test_1.it)("bloqueia login com credenciais invalidas", async () => {
        const { response, body } = await request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: defaultUser.email,
                password: "senha-errada"
            })
        });
        strict_1.default.equal(response.status, 401);
        strict_1.default.equal(body.message, "Email ou senha invalidos.");
    });
    (0, node_test_1.it)("bloqueia acesso sem bearer token valido", async () => {
        const { response, body } = await request("/dashboard");
        strict_1.default.equal(response.status, 401);
        strict_1.default.equal(body.message, "Acesso negado. Faca login para continuar.");
    });
    (0, node_test_1.it)("retorna dashboard com metricas esperadas", async () => {
        const { response, body } = await protectedRequest("/dashboard");
        strict_1.default.equal(response.status, 200);
        strict_1.default.deepEqual(body.metrics, {
            clients: 3,
            pets: 3,
            services: 9,
            todayAppointments: 3,
            confirmedAppointments: 2,
            pendingReceivables: 115,
            monthlyRevenue: 95
        });
        strict_1.default.equal(body.todayAppointments.length, 3);
        strict_1.default.equal(body.pendingCharges.length, 2);
    });
    (0, node_test_1.it)("retorna rotas de listagem com relacoes esperadas", async () => {
        const [customers, pets, services, appointments, charges] = await Promise.all([
            protectedRequest("/customers"),
            protectedRequest("/pets"),
            protectedRequest("/services"),
            protectedRequest("/appointments"),
            protectedRequest("/charges")
        ]);
        strict_1.default.equal(customers.response.status, 200);
        strict_1.default.equal(customers.body.length, 3);
        strict_1.default.equal(pets.response.status, 200);
        strict_1.default.equal(pets.body.length, 3);
        strict_1.default.ok(pets.body.every((item) => item.customer?.id));
        strict_1.default.equal(services.response.status, 200);
        strict_1.default.equal(services.body.length, 9);
        strict_1.default.equal(appointments.response.status, 200);
        strict_1.default.equal(appointments.body.length, 3);
        strict_1.default.ok(appointments.body.every((item) => item.customer?.id && item.pet?.id && item.service?.id));
        strict_1.default.equal(charges.response.status, 200);
        strict_1.default.equal(charges.body.length, 3);
        strict_1.default.ok(charges.body.every((item) => item.appointment?.id));
    });
    (0, node_test_1.it)("cria agendamento, atualiza status e envia lembrete", async () => {
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
        strict_1.default.equal(created.response.status, 201);
        strict_1.default.equal(created.body.status, "pendente");
        strict_1.default.equal(created.body.reminderSent, false);
        const updated = await protectedRequest(`/appointments/${created.body.id}/status`, {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ status: "confirmado" })
        });
        strict_1.default.equal(updated.response.status, 200);
        strict_1.default.equal(updated.body.status, "confirmado");
        const reminder = await protectedRequest(`/notifications/reminder/${created.body.id}`, {
            method: "POST"
        });
        strict_1.default.equal(reminder.response.status, 200);
        strict_1.default.equal(reminder.body.ok, true);
        strict_1.default.equal(reminder.body.mode, "simulation");
        const appointmentsResponse = await protectedRequest("/appointments");
        const savedAppointment = appointmentsResponse.body.find((item) => item.id === created.body.id);
        strict_1.default.ok(savedAppointment);
        strict_1.default.equal(savedAppointment.reminderSent, true);
    });
    (0, node_test_1.it)("retira atendimento da fila sem apagar o cadastro", async () => {
        const removed = await protectedRequest("/appointments/a2/remove-from-queue", {
            method: "PATCH"
        });
        strict_1.default.equal(removed.response.status, 204);
        const dashboard = await protectedRequest("/dashboard");
        strict_1.default.equal(dashboard.body.todayAppointments.length, 2);
        strict_1.default.ok(!dashboard.body.todayAppointments.some((item) => item.id === "a2"));
        const appointments = await protectedRequest("/appointments");
        const hiddenAppointment = appointments.body.find((item) => item.id === "a2");
        strict_1.default.ok(hiddenAppointment);
        strict_1.default.equal(hiddenAppointment.hiddenFromQueue, true);
        const restored = await protectedRequest("/appointments/a2/restore-to-queue", {
            method: "PATCH"
        });
        strict_1.default.equal(restored.response.status, 204);
        const restoredDashboard = await protectedRequest("/dashboard");
        strict_1.default.equal(restoredDashboard.body.todayAppointments.length, 3);
    });
    (0, node_test_1.it)("exclui definitivamente atendimento fora da fila", async () => {
        const removed = await protectedRequest("/appointments/a2/remove-from-queue", {
            method: "PATCH"
        });
        strict_1.default.equal(removed.response.status, 204);
        const deleted = await protectedRequest("/appointments/a2", {
            method: "DELETE"
        });
        strict_1.default.equal(deleted.response.status, 204);
        const appointments = await protectedRequest("/appointments");
        strict_1.default.ok(!appointments.body.some((item) => item.id === "a2"));
        const dashboard = await protectedRequest("/dashboard");
        strict_1.default.equal(dashboard.body.pendingCharges.length, 1);
    });
    (0, node_test_1.it)("atualiza cobranca para paga e nao paga novamente", async () => {
        const paid = await protectedRequest("/charges/ch2/payment-status", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ paid: true })
        });
        strict_1.default.equal(paid.response.status, 200);
        strict_1.default.equal(paid.body.paid, true);
        const dashboardAfterPaid = await protectedRequest("/dashboard");
        strict_1.default.equal(dashboardAfterPaid.body.pendingCharges.length, 1);
        const unpaid = await protectedRequest("/charges/ch2/payment-status", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ paid: false })
        });
        strict_1.default.equal(unpaid.response.status, 200);
        strict_1.default.equal(unpaid.body.paid, false);
        const dashboardAfterUnpaid = await protectedRequest("/dashboard");
        strict_1.default.equal(dashboardAfterUnpaid.body.pendingCharges.length, 2);
    });
    (0, node_test_1.it)("atualiza metodo de pagamento da cobranca", async () => {
        const updated = await protectedRequest("/charges/ch2/payment-method", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ method: "cartao" })
        });
        strict_1.default.equal(updated.response.status, 200);
        strict_1.default.equal(updated.body.method, "cartao");
        const charges = await protectedRequest("/charges");
        const updatedCharge = charges.body.find((item) => item.id === "ch2");
        strict_1.default.ok(updatedCharge);
        strict_1.default.equal(updatedCharge.method, "cartao");
    });
    (0, node_test_1.it)("retorna 404 ao atualizar cobranca inexistente", async () => {
        const { response, body } = await protectedRequest("/charges/inexistente/payment-status", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ paid: true })
        });
        strict_1.default.equal(response.status, 404);
        strict_1.default.equal(body.message, "Cobranca nao encontrada.");
    });
    (0, node_test_1.it)("retorna 404 ao atualizar metodo de cobranca inexistente", async () => {
        const { response, body } = await protectedRequest("/charges/inexistente/payment-method", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ method: "pix" })
        });
        strict_1.default.equal(response.status, 404);
        strict_1.default.equal(body.message, "Cobranca nao encontrada.");
    });
    (0, node_test_1.it)("retorna 400 para payload invalido", async () => {
        const { response, body } = await protectedRequest("/appointments", {
            method: "POST",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                customerId: "c1"
            })
        });
        strict_1.default.equal(response.status, 400);
        strict_1.default.equal(body.message, "Dados invalidos na requisicao.");
        strict_1.default.ok(Array.isArray(body.issues));
    });
    (0, node_test_1.it)("retorna 404 ao atualizar agendamento inexistente", async () => {
        const { response, body } = await protectedRequest("/appointments/inexistente/status", {
            method: "PATCH",
            headers: withAuthHeaders({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ status: "confirmado" })
        });
        strict_1.default.equal(response.status, 404);
        strict_1.default.equal(body.message, "Agendamento nao encontrado.");
    });
});
