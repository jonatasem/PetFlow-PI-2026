import dayjs from "dayjs";
import { env } from "../config/env";
import { getRepository } from "../data/database";

async function buildReminderMessage(appointmentId: string) {
  const repository = getRepository();
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
    body: `Ola, ${customer.name}. Este e um lembrete do agendamento de ${service.name.toLowerCase()} do pet ${pet.name} em ${dayjs(appointment.startsAt).format("DD/MM/YYYY HH:mm")}.`
  };
}

export async function sendReminder(appointmentId: string) {
  const repository = getRepository();
  const message = await buildReminderMessage(appointmentId);

  if (!message) {
    return {
      ok: false,
      mode: "not-found",
      message: "Agendamento nao encontrado para envio do lembrete."
    };
  }

  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
    await repository.markReminderSent(appointmentId);

    return {
      ok: true,
      mode: "simulation",
      payload: message
    };
  }

  const response = await fetch(`${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
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
