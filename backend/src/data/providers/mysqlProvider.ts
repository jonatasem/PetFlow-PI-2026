import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import type { Appointment, AppointmentStatus, AuthUser, Charge, Customer, Pet, ServiceItem } from "../mockDb";
import type { DataRepository, NewAppointmentInput, NewAuthUserInput } from "../repository";

type CustomerRow = RowDataPacket & Customer;
type PetRow = RowDataPacket & Pet;
type ServiceRow = RowDataPacket & ServiceItem;
type AuthUserRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "admin";
  createdAt: string | Date;
};
type AppointmentRow = RowDataPacket & {
  id: string;
  customerId: string;
  petId: string;
  serviceId: string;
  startsAt: string | Date;
  status: AppointmentStatus;
  reminderSent: number;
  hiddenFromQueue: number;
};
type ChargeRow = RowDataPacket & {
  id: string;
  appointmentId: string;
  amount: number;
  paid: number;
  method: Charge["method"];
};

function normalizeAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerId: row.customerId,
    petId: row.petId,
    serviceId: row.serviceId,
    startsAt: new Date(row.startsAt).toISOString(),
    status: row.status,
    reminderSent: Boolean(row.reminderSent),
    hiddenFromQueue: Boolean(row.hiddenFromQueue)
  };
}

function normalizeCharge(row: ChargeRow): Charge {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    amount: Number(row.amount),
    paid: Boolean(row.paid),
    method: row.method
  };
}

function normalizeAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    passwordSalt: row.passwordSalt,
    role: row.role,
    createdAt: new Date(row.createdAt).toISOString()
  };
}

export class MySqlProvider implements DataRepository {
  private readonly pool: Pool;

  constructor() {
    if (!env.MYSQL_URL) {
      throw new Error("MYSQL_URL nao configurada.");
    }

    this.pool = createPool({
      uri: env.MYSQL_URL,
      connectionLimit: 10
    });
  }

  async getAuthUserByEmail(email: string) {
    const [rows] = await this.pool.query<AuthUserRow[]>(
      "SELECT id, name, email, passwordHash, passwordSalt, role, createdAt FROM auth_users WHERE email = ? LIMIT 1",
      [email]
    );

    return rows[0] ? normalizeAuthUser(rows[0]) : null;
  }

  async createAuthUser(input: NewAuthUserInput) {
    const user: AuthUser = {
      id: `u${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      role: input.role ?? "admin",
      createdAt: new Date().toISOString()
    };

    await this.pool.query(
      "INSERT INTO auth_users (id, name, email, passwordHash, passwordSalt, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [user.id, user.name, user.email, user.passwordHash, user.passwordSalt, user.role, new Date(user.createdAt)]
    );

    return user;
  }

  async getCustomers() {
    const [rows] = await this.pool.query<CustomerRow[]>("SELECT id, name, phone, email FROM customers ORDER BY name");
    return rows.map((row) => ({ ...row }));
  }

  async getPets() {
    const [rows] = await this.pool.query<PetRow[]>("SELECT id, customerId, name, species, breed, notes FROM pets ORDER BY name");
    return rows.map((row) => ({ ...row }));
  }

  async getServices() {
    const [rows] = await this.pool.query<ServiceRow[]>("SELECT id, name, durationMinutes, price FROM services ORDER BY name");
    return rows.map((row) => ({ ...row, price: Number(row.price) }));
  }

  async getAppointments() {
    const [rows] = await this.pool.query<AppointmentRow[]>(
      "SELECT id, customerId, petId, serviceId, startsAt, status, reminderSent, hiddenFromQueue FROM appointments ORDER BY startsAt"
    );

    return rows.map(normalizeAppointment);
  }

  async getAppointmentById(id: string) {
    const [rows] = await this.pool.query<AppointmentRow[]>(
      "SELECT id, customerId, petId, serviceId, startsAt, status, reminderSent, hiddenFromQueue FROM appointments WHERE id = ? LIMIT 1",
      [id]
    );

    return rows[0] ? normalizeAppointment(rows[0]) : null;
  }

  async createAppointment(input: NewAppointmentInput): Promise<Appointment> {
    if (!input.customerId || !input.petId || !input.serviceId) {
      throw new Error("O provider MySQL exige IDs existentes para cliente, pet e servico.");
    }

    const id = `a${Date.now()}`;
    const chargeId = `ch${Date.now()}`;
    const [serviceRows] = await this.pool.query<ServiceRow[]>("SELECT id, name, durationMinutes, price FROM services WHERE id = ? LIMIT 1", [input.serviceId]);
    const servicePrice = Number(serviceRows[0]?.price ?? 0);

    await this.pool.query(
      "INSERT INTO appointments (id, customerId, petId, serviceId, startsAt, status, reminderSent, hiddenFromQueue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, input.customerId, input.petId, input.serviceId, input.startsAt, "pendente", 0, 0]
    );

    await this.pool.query("INSERT INTO charges (id, appointmentId, amount, paid, method) VALUES (?, ?, ?, ?, ?)", [chargeId, id, servicePrice, 0, "pix"]);

    return {
      id,
      customerId: input.customerId,
      petId: input.petId,
      serviceId: input.serviceId,
      startsAt: input.startsAt,
      status: "pendente",
      reminderSent: false,
      hiddenFromQueue: false
    };
  }

  async deleteAppointment(id: string) {
    await this.pool.query("DELETE FROM charges WHERE appointmentId = ?", [id]);
    const [result] = await this.pool.query("DELETE FROM appointments WHERE id = ?", [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }

  async removeAppointmentFromQueue(id: string) {
    const [result] = await this.pool.query("UPDATE appointments SET hiddenFromQueue = 1 WHERE id = ?", [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }

  async restoreAppointmentToQueue(id: string) {
    const [result] = await this.pool.query("UPDATE appointments SET hiddenFromQueue = 0 WHERE id = ?", [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    await this.pool.query("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);
    return this.getAppointmentById(id);
  }

  async markReminderSent(id: string) {
    const [result] = await this.pool.query("UPDATE appointments SET reminderSent = 1 WHERE id = ?", [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  }

  async getCharges() {
    const [rows] = await this.pool.query<ChargeRow[]>("SELECT id, appointmentId, amount, paid, method FROM charges ORDER BY paid, id");
    return rows.map(normalizeCharge);
  }

  async updateChargePaymentStatus(id: string, paid: boolean) {
    await this.pool.query("UPDATE charges SET paid = ? WHERE id = ?", [paid ? 1 : 0, id]);
    const [rows] = await this.pool.query<ChargeRow[]>("SELECT id, appointmentId, amount, paid, method FROM charges WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? normalizeCharge(rows[0]) : null;
  }

  async updateChargePaymentMethod(id: string, method: Charge["method"]) {
    await this.pool.query("UPDATE charges SET method = ? WHERE id = ?", [method, id]);
    const [rows] = await this.pool.query<ChargeRow[]>("SELECT id, appointmentId, amount, paid, method FROM charges WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? normalizeCharge(rows[0]) : null;
  }
}
