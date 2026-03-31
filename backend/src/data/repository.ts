import type { Appointment, AppointmentStatus, Charge, Customer, Pet, ServiceItem } from "./mockDb";

export interface NewAppointmentInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  petId?: string;
  petName?: string;
  petSpecies?: string;
  petBreed?: string;
  serviceId?: string;
  serviceName?: string;
  serviceDurationMinutes?: number;
  servicePrice?: number;
  startsAt: string;
}

export interface DataRepository {
  getCustomers(): Promise<Customer[]>;
  getPets(): Promise<Pet[]>;
  getServices(): Promise<ServiceItem[]>;
  getAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  createAppointment(input: NewAppointmentInput): Promise<Appointment>;
  deleteAppointment(id: string): Promise<boolean>;
  removeAppointmentFromQueue(id: string): Promise<boolean>;
  restoreAppointmentToQueue(id: string): Promise<boolean>;
  updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment | null>;
  markReminderSent(id: string): Promise<boolean>;
  getCharges(): Promise<Charge[]>;
  updateChargePaymentStatus(id: string, paid: boolean): Promise<Charge | null>;
  updateChargePaymentMethod(id: string, method: Charge["method"]): Promise<Charge | null>;
}
