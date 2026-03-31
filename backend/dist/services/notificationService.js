"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReminder = sendReminder;
const dayjs_1 = __importDefault(require("dayjs"));
const env_1 = require("../config/env");
const database_1 = require("../data/database");
async function buildReminderMessage(appointmentId) {
    const repository = (0, database_1.getRepository)();
    const appointment = await repository.getAppointmentById(appointmentId);
    if (!appointment) {
        return null;
    }
    const [customers, pets, services] = await Promise.all([
        repository.getCustomers(),
        repository.getPets(),
        repository.getServices()
    ]);
    const customer = customers.find((item) => item.id === appointment.customerId);
    const pet = pets.find((item) => item.id === appointment.petId);
    const service = services.find((item) => item.id === appointment.serviceId);
    if (!customer || !pet || !service) {
        return null;
    }
    return {
        to: customer.phone,
        body: `Ola, ${customer.name}. Este e um lembrete do agendamento de ${service.name.toLowerCase()} do pet ${pet.name} em ${(0, dayjs_1.default)(appointment.startsAt).format("DD/MM/YYYY HH:mm")}.`
    };
}
async function sendReminder(appointmentId) {
    const repository = (0, database_1.getRepository)();
    const message = await buildReminderMessage(appointmentId);
    if (!message) {
        return {
            ok: false,
            mode: "not-found",
            message: "Agendamento nao encontrado para envio do lembrete."
        };
    }
    if (!env_1.env.WHATSAPP_TOKEN || !env_1.env.WHATSAPP_PHONE_ID) {
        await repository.markReminderSent(appointmentId);
        return {
            ok: true,
            mode: "simulation",
            payload: message
        };
    }
    const response = await fetch(`${env_1.env.WHATSAPP_API_URL}/${env_1.env.WHATSAPP_PHONE_ID}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env_1.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.to.replace(/\D/g, ""),
            type: "text",
            text: {
                body: message.body
            }
        })
    });
    const result = await response.json();
    if (response.ok) {
        await repository.markReminderSent(appointmentId);
    }
    return {
        ok: response.ok,
        mode: "live",
        payload: result
    };
}
