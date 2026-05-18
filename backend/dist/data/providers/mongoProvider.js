"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoProvider = void 0;
const mongodb_1 = require("mongodb");
const env_1 = require("../../config/env");
function stripMongoId(document) {
    const { _id: _ignored, ...entity } = document;
    return entity;
}
class MongoProvider {
    client;
    db;
    async getDb() {
        if (this.db) {
            return this.db;
        }
        if (!env_1.env.MONGODB_URI) {
            throw new Error("MONGODB_URI nao configurada.");
        }
        this.client = new mongodb_1.MongoClient(env_1.env.MONGODB_URI);
        await this.client.connect();
        this.db = this.client.db();
        return this.db;
    }
    async getAuthUserByEmail(email) {
        const db = await this.getDb();
        const row = await db.collection("authUsers").findOne({ email });
        return row ? stripMongoId(row) : null;
    }
    async createAuthUser(input) {
        const db = await this.getDb();
        const user = {
            id: `u${Date.now()}`,
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: input.passwordHash,
            passwordSalt: input.passwordSalt,
            role: input.role ?? "admin",
            createdAt: new Date().toISOString()
        };
        await db.collection("authUsers").insertOne(user);
        return user;
    }
    async getCustomers() {
        const db = await this.getDb();
        const rows = await db.collection("customers").find().sort({ name: 1 }).toArray();
        return rows.map(stripMongoId);
    }
    async getPets() {
        const db = await this.getDb();
        const rows = await db.collection("pets").find().sort({ name: 1 }).toArray();
        return rows.map(stripMongoId);
    }
    async getServices() {
        const db = await this.getDb();
        const rows = await db.collection("services").find().sort({ name: 1 }).toArray();
        return rows.map(stripMongoId);
    }
    async getAppointments() {
        const db = await this.getDb();
        const rows = await db.collection("appointments").find().sort({ startsAt: 1 }).toArray();
        return rows.map(stripMongoId);
    }
    async getAppointmentById(id) {
        const db = await this.getDb();
        const row = await db.collection("appointments").findOne({ id });
        return row ? stripMongoId(row) : null;
    }
    async createAppointment(input) {
        if (!input.customerId || !input.petId || !input.serviceId) {
            throw new Error("O provider MongoDB exige IDs existentes para cliente, pet e servico.");
        }
        const db = await this.getDb();
        const chargeId = `ch${Date.now()}`;
        const service = await db.collection("services").findOne({ id: input.serviceId });
        const appointment = {
            id: `a${Date.now()}`,
            customerId: input.customerId,
            petId: input.petId,
            serviceId: input.serviceId,
            startsAt: input.startsAt,
            status: "pendente",
            reminderSent: false,
            hiddenFromQueue: false
        };
        await db.collection("appointments").insertOne(appointment);
        await db.collection("charges").insertOne({
            id: chargeId,
            appointmentId: appointment.id,
            amount: Number(service?.price ?? 0),
            paid: false,
            method: "pix"
        });
        return appointment;
    }
    async deleteAppointment(id) {
        const db = await this.getDb();
        await db.collection("charges").deleteMany({ appointmentId: id });
        const result = await db.collection("appointments").deleteOne({ id });
        return result.deletedCount > 0;
    }
    async removeAppointmentFromQueue(id) {
        const db = await this.getDb();
        const result = await db.collection("appointments").updateOne({ id }, { $set: { hiddenFromQueue: true } });
        return result.matchedCount > 0;
    }
    async restoreAppointmentToQueue(id) {
        const db = await this.getDb();
        const result = await db.collection("appointments").updateOne({ id }, { $set: { hiddenFromQueue: false } });
        return result.matchedCount > 0;
    }
    async updateAppointmentStatus(id, status) {
        const db = await this.getDb();
        await db.collection("appointments").updateOne({ id }, { $set: { status } });
        return this.getAppointmentById(id);
    }
    async markReminderSent(id) {
        const db = await this.getDb();
        const result = await db.collection("appointments").updateOne({ id }, { $set: { reminderSent: true } });
        return result.matchedCount > 0;
    }
    async getCharges() {
        const db = await this.getDb();
        const rows = await db.collection("charges").find().sort({ paid: 1, id: 1 }).toArray();
        return rows.map(stripMongoId);
    }
    async updateChargePaymentStatus(id, paid) {
        const db = await this.getDb();
        const existingCharge = await db.collection("charges").findOne({ id });
        if (!existingCharge) {
            return null;
        }
        await db.collection("charges").updateOne({ id }, { $set: { paid } });
        return {
            ...stripMongoId(existingCharge),
            paid
        };
    }
    async updateChargePaymentMethod(id, method) {
        const db = await this.getDb();
        const existingCharge = await db.collection("charges").findOne({ id });
        if (!existingCharge) {
            return null;
        }
        await db.collection("charges").updateOne({ id }, { $set: { method } });
        return {
            ...stripMongoId(existingCharge),
            method
        };
    }
}
exports.MongoProvider = MongoProvider;
