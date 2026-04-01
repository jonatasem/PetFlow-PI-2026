import { MongoClient, type Db } from "mongodb";
import { env } from "../../config/env";
import type { Appointment, AppointmentStatus, AuthUser, Charge, Customer, Pet, ServiceItem } from "../mockDb";
import type { DataRepository, NewAppointmentInput, NewAuthUserInput } from "../repository";

type MongoEntity<T> = T & { _id?: string };

function stripMongoId<T>(document: MongoEntity<T>): T {
  const { _id: _ignored, ...entity } = document;
  return entity as T;
}

export class MongoProvider implements DataRepository {
  private client?: MongoClient;
  private db?: Db;

  private async getDb() {
    if (this.db) {
      return this.db;
    }

    if (!env.MONGODB_URI) {
      throw new Error("MONGODB_URI nao configurada.");
    }

    this.client = new MongoClient(env.MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db();
    return this.db;
  }

  async getAuthUserByEmail(email: string) {
    const db = await this.getDb();
    const row = await db.collection<MongoEntity<AuthUser>>("authUsers").findOne({ email });
    return row ? stripMongoId(row) : null;
  }

  async createAuthUser(input: NewAuthUserInput) {
    const db = await this.getDb();
    const user: AuthUser = {
      id: `u${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      role: input.role ?? "admin",
      createdAt: new Date().toISOString()
    };

    await db.collection<AuthUser>("authUsers").insertOne(user);
    return user;
  }

  async getCustomers() {
    const db = await this.getDb();
    const rows = await db.collection<MongoEntity<Customer>>("customers").find().sort({ name: 1 }).toArray();
    return rows.map(stripMongoId);
  }

  async getPets() {
    const db = await this.getDb();
    const rows = await db.collection<MongoEntity<Pet>>("pets").find().sort({ name: 1 }).toArray();
    return rows.map(stripMongoId);
  }

  async getServices() {
    const db = await this.getDb();
    const rows = await db.collection<MongoEntity<ServiceItem>>("services").find().sort({ name: 1 }).toArray();
    return rows.map(stripMongoId);
  }

  async getAppointments() {
    const db = await this.getDb();
    const rows = await db.collection<MongoEntity<Appointment>>("appointments").find().sort({ startsAt: 1 }).toArray();
    return rows.map(stripMongoId);
  }

  async getAppointmentById(id: string) {
    const db = await this.getDb();
    const row = await db.collection<MongoEntity<Appointment>>("appointments").findOne({ id });
    return row ? stripMongoId(row) : null;
  }

  async createAppointment(input: NewAppointmentInput) {
    if (!input.customerId || !input.petId || !input.serviceId) {
      throw new Error("O provider MongoDB exige IDs existentes para cliente, pet e servico.");
    }

    const db = await this.getDb();
    const chargeId = `ch${Date.now()}`;
    const service = await db.collection<MongoEntity<ServiceItem>>("services").findOne({ id: input.serviceId });
    const appointment: Appointment = {
      id: `a${Date.now()}`,
      customerId: input.customerId,
      petId: input.petId,
      serviceId: input.serviceId,
      startsAt: input.startsAt,
      status: "pendente",
      reminderSent: false,
      hiddenFromQueue: false
    };

    await db.collection<Appointment>("appointments").insertOne(appointment);
    await db.collection<Charge>("charges").insertOne({
      id: chargeId,
      appointmentId: appointment.id,
      amount: Number(service?.price ?? 0),
      paid: false,
      method: "pix"
    });
    return appointment;
  }

  async deleteAppointment(id: string) {
    const db = await this.getDb();
    await db.collection<Charge>("charges").deleteMany({ appointmentId: id });
    const result = await db.collection<Appointment>("appointments").deleteOne({ id });
    return result.deletedCount > 0;
  }

  async removeAppointmentFromQueue(id: string) {
    const db = await this.getDb();
    const result = await db.collection<Appointment>("appointments").updateOne({ id }, { $set: { hiddenFromQueue: true } });
    return result.matchedCount > 0;
  }

  async restoreAppointmentToQueue(id: string) {
    const db = await this.getDb();
    const result = await db.collection<Appointment>("appointments").updateOne({ id }, { $set: { hiddenFromQueue: false } });
    return result.matchedCount > 0;
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const db = await this.getDb();
    await db.collection<Appointment>("appointments").updateOne({ id }, { $set: { status } });
    return this.getAppointmentById(id);
  }

  async markReminderSent(id: string) {
    const db = await this.getDb();
    const result = await db.collection<Appointment>("appointments").updateOne({ id }, { $set: { reminderSent: true } });
    return result.matchedCount > 0;
  }

  async getCharges() {
    const db = await this.getDb();
    const rows = await db.collection<MongoEntity<Charge>>("charges").find().sort({ paid: 1, id: 1 }).toArray();
    return rows.map(stripMongoId);
  }

  async updateChargePaymentStatus(id: string, paid: boolean) {
    const db = await this.getDb();
    const existingCharge = await db.collection<MongoEntity<Charge>>("charges").findOne({ id });

    if (!existingCharge) {
      return null;
    }

    await db.collection<Charge>("charges").updateOne({ id }, { $set: { paid } });
    return {
      ...stripMongoId(existingCharge),
      paid
    };
  }

  async updateChargePaymentMethod(id: string, method: Charge["method"]) {
    const db = await this.getDb();
    const existingCharge = await db.collection<MongoEntity<Charge>>("charges").findOne({ id });

    if (!existingCharge) {
      return null;
    }

    await db.collection<Charge>("charges").updateOne({ id }, { $set: { method } });
    return {
      ...stripMongoId(existingCharge),
      method
    };
  }
}
