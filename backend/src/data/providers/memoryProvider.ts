import { appointments, authUsers, charges, customers, pets, services, type Appointment, type AuthUser, type Customer, type Pet, type ServiceItem } from "../mockDb";
import type { DataRepository, NewAppointmentInput, NewAuthUserInput } from "../repository";

function nextEntityId(prefix: string, currentIds: string[]) {
  const maxValue = currentIds.reduce((highest, id) => {
    const numericValue = Number(id.replace(prefix, ""));
    return Number.isNaN(numericValue) ? highest : Math.max(highest, numericValue);
  }, 0);

  return `${prefix}${maxValue + 1}`;
}

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export class MemoryProvider implements DataRepository {
  async getAuthUserByEmail(email: string) {
    return structuredClone(authUsers.find((user) => normalizeText(user.email) === normalizeText(email)) ?? null);
  }

  async createAuthUser(input: NewAuthUserInput) {
    const user: AuthUser = {
      id: nextEntityId("u", authUsers.map((item) => item.id)),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      role: input.role ?? "admin",
      createdAt: new Date().toISOString()
    };

    authUsers.push(user);
    return structuredClone(user);
  }

  async getCustomers() {
    return structuredClone(customers);
  }

  async getPets() {
    return structuredClone(pets);
  }

  async getServices() {
    return structuredClone(services);
  }

  async getAppointments() {
    return structuredClone(appointments);
  }

  async getAppointmentById(id: string) {
    return structuredClone(appointments.find((appointment) => appointment.id === id) ?? null);
  }

  async createAppointment(input: NewAppointmentInput) {
    const customer = this.resolveCustomer(input);
    const pet = this.resolvePet(input, customer.id);
    const service = this.resolveService(input);

    const appointment: Appointment = {
      id: nextEntityId("a", appointments.map((item) => item.id)),
      customerId: customer.id,
      petId: pet.id,
      serviceId: service.id,
      startsAt: input.startsAt,
      status: "pendente",
      reminderSent: false,
      hiddenFromQueue: false
    };

    appointments.push(appointment);
    charges.push({
      id: nextEntityId("ch", charges.map((item) => item.id)),
      appointmentId: appointment.id,
      amount: service.price,
      paid: false,
      method: "pix"
    });
    return structuredClone(appointment);
  }

  async deleteAppointment(id: string) {
    const appointmentIndex = appointments.findIndex((item) => item.id === id);

    if (appointmentIndex === -1) {
      return false;
    }

    appointments.splice(appointmentIndex, 1);

    for (let index = charges.length - 1; index >= 0; index -= 1) {
      if (charges[index]?.appointmentId === id) {
        charges.splice(index, 1);
      }
    }

    return true;
  }

  async removeAppointmentFromQueue(id: string) {
    const appointment = appointments.find((item) => item.id === id);

    if (!appointment) {
      return false;
    }

    appointment.hiddenFromQueue = true;

    return true;
  }

  async restoreAppointmentToQueue(id: string) {
    const appointment = appointments.find((item) => item.id === id);

    if (!appointment) {
      return false;
    }

    appointment.hiddenFromQueue = false;
    return true;
  }

  private resolveCustomer(input: NewAppointmentInput): Customer {
    if (input.customerId) {
      const existingCustomer = customers.find((item) => item.id === input.customerId);

      if (existingCustomer) {
        return existingCustomer;
      }
    }

    const customerName = input.customerName?.trim();

    if (!customerName) {
      throw new Error("Cliente nao informado.");
    }

    const existingCustomer = customers.find((item) => normalizeText(item.name) === normalizeText(customerName));

    if (existingCustomer) {
      return existingCustomer;
    }

    const customer: Customer = {
      id: nextEntityId("c", customers.map((item) => item.id)),
      name: customerName,
      phone: input.customerPhone?.trim() || "Nao informado",
      email: input.customerEmail?.trim() || `${customerName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@cadastro.local`
    };

    customers.push(customer);
    return customer;
  }

  private resolvePet(input: NewAppointmentInput, customerId: string): Pet {
    if (input.petId) {
      const existingPet = pets.find((item) => item.id === input.petId);

      if (existingPet) {
        return existingPet;
      }
    }

    const petName = input.petName?.trim();

    if (!petName) {
      throw new Error("Pet nao informado.");
    }

    const existingPet = pets.find((item) => item.customerId === customerId && normalizeText(item.name) === normalizeText(petName));

    if (existingPet) {
      return existingPet;
    }

    const pet: Pet = {
      id: nextEntityId("p", pets.map((item) => item.id)),
      customerId,
      name: petName,
      species: input.petSpecies?.trim() || "Canina",
      breed: input.petBreed?.trim() || "A definir"
    };

    pets.push(pet);
    return pet;
  }

  private resolveService(input: NewAppointmentInput): ServiceItem {
    if (input.serviceId) {
      const existingService = services.find((item) => item.id === input.serviceId);

      if (existingService) {
        return existingService;
      }
    }

    const serviceName = input.serviceName?.trim();

    if (!serviceName) {
      throw new Error("Servico nao informado.");
    }

    const existingService = services.find((item) => normalizeText(item.name) === normalizeText(serviceName));

    if (existingService) {
      return existingService;
    }

    const service: ServiceItem = {
      id: nextEntityId("s", services.map((item) => item.id)),
      name: serviceName,
      durationMinutes: input.serviceDurationMinutes ?? 60,
      price: input.servicePrice ?? 0
    };

    services.push(service);
    return service;
  }

  async updateAppointmentStatus(id: string, status: Appointment["status"]) {
    const appointment = appointments.find((item) => item.id === id);

    if (!appointment) {
      return null;
    }

    appointment.status = status;
    return structuredClone(appointment);
  }

  async markReminderSent(id: string) {
    const appointment = appointments.find((item) => item.id === id);

    if (!appointment) {
      return false;
    }

    appointment.reminderSent = true;
    return true;
  }

  async getCharges() {
    return structuredClone(charges);
  }

  async updateChargePaymentStatus(id: string, paid: boolean) {
    const charge = charges.find((item) => item.id === id);

    if (!charge) {
      return null;
    }

    charge.paid = paid;
    return structuredClone(charge);
  }

  async updateChargePaymentMethod(id: string, method: "pix" | "cartao" | "dinheiro") {
    const charge = charges.find((item) => item.id === id);

    if (!charge) {
      return null;
    }

    charge.method = method;
    return structuredClone(charge);
  }
}
