"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSnapshot = getDashboardSnapshot;
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../data/database");
async function getDashboardSnapshot() {
    const repository = (0, database_1.getRepository)();
    const [appointments, charges, customers, pets, services] = await Promise.all([
        repository.getAppointments(),
        repository.getCharges(),
        repository.getCustomers(),
        repository.getPets(),
        repository.getServices()
    ]);
    const today = (0, dayjs_1.default)("2026-03-28");
    const todayAppointments = appointments.filter((appointment) => (0, dayjs_1.default)(appointment.startsAt).isSame(today, "day") && !appointment.hiddenFromQueue);
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
