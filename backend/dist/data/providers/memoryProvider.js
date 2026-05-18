"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryProvider = void 0;
const mockDb_1 = require("../mockDb");
function nextEntityId(prefix, currentIds) {
    const maxValue = currentIds.reduce((highest, id) => {
        const numericValue = Number(id.replace(prefix, ""));
        return Number.isNaN(numericValue) ? highest : Math.max(highest, numericValue);
    }, 0);
    return `${prefix}${maxValue + 1}`;
}
function normalizeText(value) {
    return value?.trim().toLowerCase() ?? "";
}
class MemoryProvider {
    async getAuthUserByEmail(email) {
        return structuredClone(mockDb_1.authUsers.find((user) => normalizeText(user.email) === normalizeText(email)) ?? null);
    }
    async createAuthUser(input) {
        const user = {
            id: nextEntityId("u", mockDb_1.authUsers.map((item) => item.id)),
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: input.passwordHash,
            passwordSalt: input.passwordSalt,
            role: input.role ?? "admin",
            createdAt: new Date().toISOString()
        };
        mockDb_1.authUsers.push(user);
        return structuredClone(user);
    }
    async getCustomers() {
        return structuredClone(mockDb_1.customers);
    }
    async getPets() {
        return structuredClone(mockDb_1.pets);
    }
    async getServices() {
        return structuredClone(mockDb_1.services);
    }
    async getAppointments() {
        return structuredClone(mockDb_1.appointments);
    }
    async getAppointmentById(id) {
        return structuredClone(mockDb_1.appointments.find((appointment) => appointment.id === id) ?? null);
    }
    async createAppointment(input) {
        const customer = this.resolveCustomer(input);
        const pet = this.resolvePet(input, customer.id);
        const service = this.resolveService(input);
        const appointment = {
            id: nextEntityId("a", mockDb_1.appointments.map((item) => item.id)),
            customerId: customer.id,
            petId: pet.id,
            serviceId: service.id,
            startsAt: input.startsAt,
            status: "pendente",
            reminderSent: false,
            hiddenFromQueue: false
        };
        mockDb_1.appointments.push(appointment);
        mockDb_1.charges.push({
            id: nextEntityId("ch", mockDb_1.charges.map((item) => item.id)),
            appointmentId: appointment.id,
            amount: service.price,
            paid: false,
            method: "pix"
        });
        return structuredClone(appointment);
    }
    async deleteAppointment(id) {
        const appointmentIndex = mockDb_1.appointments.findIndex((item) => item.id === id);
        if (appointmentIndex === -1) {
            return false;
        }
        mockDb_1.appointments.splice(appointmentIndex, 1);
        for (let index = mockDb_1.charges.length - 1; index >= 0; index -= 1) {
            if (mockDb_1.charges[index]?.appointmentId === id) {
                mockDb_1.charges.splice(index, 1);
            }
        }
        return true;
    }
    async removeAppointmentFromQueue(id) {
        const appointment = mockDb_1.appointments.find((item) => item.id === id);
        if (!appointment) {
            return false;
        }
        appointment.hiddenFromQueue = true;
        return true;
    }
    async restoreAppointmentToQueue(id) {
        const appointment = mockDb_1.appointments.find((item) => item.id === id);
        if (!appointment) {
            return false;
        }
        appointment.hiddenFromQueue = false;
        return true;
    }
    resolveCustomer(input) {
        if (input.customerId) {
            const existingCustomer = mockDb_1.customers.find((item) => item.id === input.customerId);
            if (existingCustomer) {
                return existingCustomer;
            }
        }
        const customerName = input.customerName?.trim();
        if (!customerName) {
            throw new Error("Cliente nao informado.");
        }
        const existingCustomer = mockDb_1.customers.find((item) => normalizeText(item.name) === normalizeText(customerName));
        if (existingCustomer) {
            return existingCustomer;
        }
        const customer = {
            id: nextEntityId("c", mockDb_1.customers.map((item) => item.id)),
            name: customerName,
            phone: input.customerPhone?.trim() || "Nao informado",
            email: input.customerEmail?.trim() || `${customerName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@cadastro.local`
        };
        mockDb_1.customers.push(customer);
        return customer;
    }
    resolvePet(input, customerId) {
        if (input.petId) {
            const existingPet = mockDb_1.pets.find((item) => item.id === input.petId);
            if (existingPet) {
                return existingPet;
            }
        }
        const petName = input.petName?.trim();
        if (!petName) {
            throw new Error("Pet nao informado.");
        }
        const existingPet = mockDb_1.pets.find((item) => item.customerId === customerId && normalizeText(item.name) === normalizeText(petName));
        if (existingPet) {
            return existingPet;
        }
        const pet = {
            id: nextEntityId("p", mockDb_1.pets.map((item) => item.id)),
            customerId,
            name: petName,
            species: input.petSpecies?.trim() || "Canina",
            breed: input.petBreed?.trim() || "A definir"
        };
        mockDb_1.pets.push(pet);
        return pet;
    }
    resolveService(input) {
        if (input.serviceId) {
            const existingService = mockDb_1.services.find((item) => item.id === input.serviceId);
            if (existingService) {
                return existingService;
            }
        }
        const serviceName = input.serviceName?.trim();
        if (!serviceName) {
            throw new Error("Servico nao informado.");
        }
        const existingService = mockDb_1.services.find((item) => normalizeText(item.name) === normalizeText(serviceName));
        if (existingService) {
            return existingService;
        }
        const service = {
            id: nextEntityId("s", mockDb_1.services.map((item) => item.id)),
            name: serviceName,
            durationMinutes: input.serviceDurationMinutes ?? 60,
            price: input.servicePrice ?? 0
        };
        mockDb_1.services.push(service);
        return service;
    }
    async updateAppointmentStatus(id, status) {
        const appointment = mockDb_1.appointments.find((item) => item.id === id);
        if (!appointment) {
            return null;
        }
        appointment.status = status;
        return structuredClone(appointment);
    }
    async markReminderSent(id) {
        const appointment = mockDb_1.appointments.find((item) => item.id === id);
        if (!appointment) {
            return false;
        }
        appointment.reminderSent = true;
        return true;
    }
    async getCharges() {
        return structuredClone(mockDb_1.charges);
    }
    async updateChargePaymentStatus(id, paid) {
        const charge = mockDb_1.charges.find((item) => item.id === id);
        if (!charge) {
            return null;
        }
        charge.paid = paid;
        return structuredClone(charge);
    }
    async updateChargePaymentMethod(id, method) {
        const charge = mockDb_1.charges.find((item) => item.id === id);
        if (!charge) {
            return null;
        }
        charge.method = method;
        return structuredClone(charge);
    }
}
exports.MemoryProvider = MemoryProvider;
