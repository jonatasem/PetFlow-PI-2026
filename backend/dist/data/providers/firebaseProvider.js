"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseProvider = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const env_1 = require("../../config/env");
class FirebaseProvider {
    db;
    constructor() {
        if (!env_1.env.FIREBASE_PROJECT_ID || !env_1.env.FIREBASE_CLIENT_EMAIL || !env_1.env.FIREBASE_PRIVATE_KEY) {
            throw new Error("Credenciais do Firebase nao configuradas.");
        }
        const app = (0, app_1.getApps)()[0] ??
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId: env_1.env.FIREBASE_PROJECT_ID,
                    clientEmail: env_1.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: env_1.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
                })
            });
        this.db = (0, firestore_1.getFirestore)(app);
    }
    async getAuthUserByEmail(email) {
        const snapshot = await this.db.collection("authUsers").where("email", "==", email).limit(1).get();
        return snapshot.empty ? null : snapshot.docs[0]?.data();
    }
    async createAuthUser(input) {
        const user = {
            id: `u${Date.now()}`,
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: input.passwordHash,
            passwordSalt: input.passwordSalt,
            role: input.role ?? "admin",
            createdAt: new Date().toISOString()
        };
        await this.db.collection("authUsers").doc(user.id).set(user);
        return user;
    }
    async getCustomers() {
        const snapshot = await this.db.collection("customers").orderBy("name").get();
        return snapshot.docs.map((doc) => doc.data());
    }
    async getPets() {
        const snapshot = await this.db.collection("pets").orderBy("name").get();
        return snapshot.docs.map((doc) => doc.data());
    }
    async getServices() {
        const snapshot = await this.db.collection("services").orderBy("name").get();
        return snapshot.docs.map((doc) => doc.data());
    }
    async getAppointments() {
        const snapshot = await this.db.collection("appointments").orderBy("startsAt").get();
        return snapshot.docs.map((doc) => doc.data());
    }
    async getAppointmentById(id) {
        const snapshot = await this.db.collection("appointments").doc(id).get();
        return snapshot.exists ? snapshot.data() : null;
    }
    async createAppointment(input) {
        if (!input.customerId || !input.petId || !input.serviceId) {
            throw new Error("O provider Firebase exige IDs existentes para cliente, pet e servico.");
        }
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
        await this.db.collection("appointments").doc(appointment.id).set(appointment);
        const chargeId = `ch${Date.now()}`;
        const serviceSnapshot = await this.db.collection("services").doc(input.serviceId).get();
        const service = serviceSnapshot.data();
        await this.db.collection("charges").doc(chargeId).set({
            id: chargeId,
            appointmentId: appointment.id,
            amount: Number(service?.price ?? 0),
            paid: false,
            method: "pix"
        });
        return appointment;
    }
    async deleteAppointment(id) {
        const appointmentReference = this.db.collection("appointments").doc(id);
        const appointmentSnapshot = await appointmentReference.get();
        if (!appointmentSnapshot.exists) {
            return false;
        }
        const chargeSnapshots = await this.db.collection("charges").where("appointmentId", "==", id).get();
        await Promise.all(chargeSnapshots.docs.map((doc) => doc.ref.delete()));
        await appointmentReference.delete();
        return true;
    }
    async removeAppointmentFromQueue(id) {
        const appointmentReference = this.db.collection("appointments").doc(id);
        const appointmentSnapshot = await appointmentReference.get();
        if (!appointmentSnapshot.exists) {
            return false;
        }
        await appointmentReference.update({ hiddenFromQueue: true });
        return true;
    }
    async restoreAppointmentToQueue(id) {
        const appointmentReference = this.db.collection("appointments").doc(id);
        const appointmentSnapshot = await appointmentReference.get();
        if (!appointmentSnapshot.exists) {
            return false;
        }
        await appointmentReference.update({ hiddenFromQueue: false });
        return true;
    }
    async updateAppointmentStatus(id, status) {
        const reference = this.db.collection("appointments").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) {
            return null;
        }
        await reference.update({ status });
        return this.getAppointmentById(id);
    }
    async markReminderSent(id) {
        const reference = this.db.collection("appointments").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) {
            return false;
        }
        await reference.update({ reminderSent: true });
        return true;
    }
    async getCharges() {
        const snapshot = await this.db.collection("charges").orderBy("paid").orderBy("id").get();
        return snapshot.docs.map((doc) => doc.data());
    }
    async updateChargePaymentStatus(id, paid) {
        const reference = this.db.collection("charges").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) {
            return null;
        }
        await reference.update({ paid });
        const updatedSnapshot = await reference.get();
        return updatedSnapshot.data();
    }
    async updateChargePaymentMethod(id, method) {
        const reference = this.db.collection("charges").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) {
            return null;
        }
        await reference.update({ method });
        const updatedSnapshot = await reference.get();
        return updatedSnapshot.data();
    }
}
exports.FirebaseProvider = FirebaseProvider;
