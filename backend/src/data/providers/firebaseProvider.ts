import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { env } from "../../config/env";
import type { Appointment, AppointmentStatus, Charge, Customer, Pet, ServiceItem } from "../mockDb";
import type { DataRepository, NewAppointmentInput } from "../repository";

export class FirebaseProvider implements DataRepository {
  private readonly db: Firestore;

  constructor() {
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
      throw new Error("Credenciais do Firebase nao configuradas.");
    }

    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        })
      });

    this.db = getFirestore(app);
  }

  async getCustomers() {
    const snapshot = await this.db.collection("customers").orderBy("name").get();
    return snapshot.docs.map((doc) => doc.data() as Customer);
  }

  async getPets() {
    const snapshot = await this.db.collection("pets").orderBy("name").get();
    return snapshot.docs.map((doc) => doc.data() as Pet);
  }

  async getServices() {
    const snapshot = await this.db.collection("services").orderBy("name").get();
    return snapshot.docs.map((doc) => doc.data() as ServiceItem);
  }

  async getAppointments() {
    const snapshot = await this.db.collection("appointments").orderBy("startsAt").get();
    return snapshot.docs.map((doc) => doc.data() as Appointment);
  }

  async getAppointmentById(id: string) {
    const snapshot = await this.db.collection("appointments").doc(id).get();
    return snapshot.exists ? (snapshot.data() as Appointment) : null;
  }

  async createAppointment(input: NewAppointmentInput) {
    if (!input.customerId || !input.petId || !input.serviceId) {
      throw new Error("O provider Firebase exige IDs existentes para cliente, pet e servico.");
    }

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

    await this.db.collection("appointments").doc(appointment.id).set(appointment);
    const chargeId = `ch${Date.now()}`;
    const serviceSnapshot = await this.db.collection("services").doc(input.serviceId).get();
    const service = serviceSnapshot.data() as ServiceItem | undefined;

    await this.db.collection("charges").doc(chargeId).set({
      id: chargeId,
      appointmentId: appointment.id,
      amount: Number(service?.price ?? 0),
      paid: false,
      method: "pix"
    } satisfies Charge);
    return appointment;
  }

  async deleteAppointment(id: string) {
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

  async removeAppointmentFromQueue(id: string) {
    const appointmentReference = this.db.collection("appointments").doc(id);
    const appointmentSnapshot = await appointmentReference.get();

    if (!appointmentSnapshot.exists) {
      return false;
    }

    await appointmentReference.update({ hiddenFromQueue: true });
    return true;
  }

  async restoreAppointmentToQueue(id: string) {
    const appointmentReference = this.db.collection("appointments").doc(id);
    const appointmentSnapshot = await appointmentReference.get();

    if (!appointmentSnapshot.exists) {
      return false;
    }

    await appointmentReference.update({ hiddenFromQueue: false });
    return true;
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const reference = this.db.collection("appointments").doc(id);
    const snapshot = await reference.get();

    if (!snapshot.exists) {
      return null;
    }

    await reference.update({ status });
    return this.getAppointmentById(id);
  }

  async markReminderSent(id: string) {
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
    return snapshot.docs.map((doc) => doc.data() as Charge);
  }

  async updateChargePaymentStatus(id: string, paid: boolean) {
    const reference = this.db.collection("charges").doc(id);
    const snapshot = await reference.get();

    if (!snapshot.exists) {
      return null;
    }

    await reference.update({ paid });
    const updatedSnapshot = await reference.get();
    return updatedSnapshot.data() as Charge;
  }

  async updateChargePaymentMethod(id: string, method: Charge["method"]) {
    const reference = this.db.collection("charges").doc(id);
    const snapshot = await reference.get();

    if (!snapshot.exists) {
      return null;
    }

    await reference.update({ method });
    const updatedSnapshot = await reference.get();
    return updatedSnapshot.data() as Charge;
  }
}
