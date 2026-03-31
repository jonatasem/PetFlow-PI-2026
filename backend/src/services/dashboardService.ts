import dayjs from "dayjs";
import { getRepository } from "../data/database";

export async function getDashboardSnapshot() {
  const repository = getRepository();
  const [appointments, charges, customers, pets, services] = await Promise.all([
    repository.getAppointments(),
    repository.getCharges(),
    repository.getCustomers(),
    repository.getPets(),
    repository.getServices()
  ]);
  const today = dayjs("2026-03-28");

  const todayAppointments = appointments.filter((appointment) => dayjs(appointment.startsAt).isSame(today, "day") && !appointment.hiddenFromQueue);
  const confirmedAppointments = todayAppointments.filter((appointment) => appointment.status === "confirmado").length;
  const pendingCharges = charges.filter((charge) => !charge.paid);
  const monthlyRevenue = charges.filter((charge) => charge.paid).reduce((sum, charge) => sum + charge.amount, 0);

  return {
    metrics: {
      clients: customers.length,
      pets: pets.length,
      services: services.length,
      todayAppointments: todayAppointments.length,
      confirmedAppointments,
      pendingReceivables: pendingCharges.reduce((sum, charge) => sum + charge.amount, 0),
      monthlyRevenue
    },
    todayAppointments: todayAppointments.map((appointment) => ({
      ...appointment,
      customer: customers.find((customer) => customer.id === appointment.customerId),
      pet: pets.find((pet) => pet.id === appointment.petId),
      service: services.find((service) => service.id === appointment.serviceId)
    })),
    pendingCharges: pendingCharges.map((charge) => ({
      ...charge,
      appointment: appointments.find((appointment) => appointment.id === charge.appointmentId)
    }))
  };
}
