import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppointmentTable } from "./AppointmentTable";
import type { Appointment } from "../types";

const appointments: Appointment[] = [
  {
    id: "a1",
    customerId: "c1",
    petId: "p1",
    serviceId: "s1",
    startsAt: "2026-03-28T10:00:00.000Z",
    status: "pendente",
    reminderSent: false,
    hiddenFromQueue: false,
    customer: { id: "c1", name: "Mariana Alves", phone: "+55 11 99123-4567", email: "mariana@cliente.com" },
    pet: { id: "p1", customerId: "c1", name: "Luna", species: "Canina", breed: "Shih-tzu" },
    service: { id: "s1", name: "Banho", durationMinutes: 60, price: 60 }
  },
  {
    id: "a2",
    customerId: "c2",
    petId: "p2",
    serviceId: "s2",
    startsAt: "2026-03-28T11:00:00.000Z",
    status: "confirmado",
    reminderSent: false,
    hiddenFromQueue: false,
    customer: { id: "c2", name: "Rafael Costa", phone: "+55 11 98888-2222", email: "rafael@cliente.com" },
    pet: { id: "p2", customerId: "c2", name: "Thor", species: "Canina", breed: "Golden Retriever" },
    service: { id: "s2", name: "Tosa", durationMinutes: 45, price: 55 }
  }
];

const hiddenAppointments: Appointment[] = [
  {
    ...appointments[0],
    id: "a3",
    hiddenFromQueue: true
  }
];

describe("AppointmentTable interactions", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("aciona atualizar status, lembrete e remover da fila", async () => {
    vi.useFakeTimers();
    const onDeleteAppointment = vi.fn();
    const onDeleteHiddenAppointment = vi.fn();
    const onRestoreAppointment = vi.fn();
    const onSendReminder = vi.fn();
    const onUpdateStatus = vi.fn();

    render(
      <AppointmentTable
        appointments={appointments}
        hiddenAppointments={hiddenAppointments}
        onDeleteAppointment={onDeleteAppointment}
        onDeleteHiddenAppointment={onDeleteHiddenAppointment}
        onRestoreAppointment={onRestoreAppointment}
        onSendReminder={onSendReminder}
        onUpdateStatus={onUpdateStatus}
      />
    );

    const confirmButtons = screen.getAllByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmButtons[0]!);
    expect(onUpdateStatus).toHaveBeenCalledWith("a1", "confirmado");

    const concludeButtons = screen.getAllByRole("button", { name: "Concluir" });
    fireEvent.click(concludeButtons[0]!);
    expect(onUpdateStatus).toHaveBeenCalledWith("a2", "concluido");

    const reminderButtons = screen.getAllByRole("button", { name: "Enviar lembrete" });
    fireEvent.click(reminderButtons[0]!);
    expect(onSendReminder).toHaveBeenCalledWith("a1");

    const excludeButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(excludeButtons[0]!);
    vi.advanceTimersByTime(220);
    expect(onDeleteAppointment).toHaveBeenCalledWith("a1");
  });

  it("aciona recolocar na fila e excluir definitivamente na lista oculta", async () => {
    const user = userEvent.setup();
    const onDeleteAppointment = vi.fn();
    const onDeleteHiddenAppointment = vi.fn();
    const onRestoreAppointment = vi.fn();
    const onSendReminder = vi.fn();
    const onUpdateStatus = vi.fn();

    render(
      <AppointmentTable
        appointments={appointments}
        hiddenAppointments={hiddenAppointments}
        onDeleteAppointment={onDeleteAppointment}
        onDeleteHiddenAppointment={onDeleteHiddenAppointment}
        onRestoreAppointment={onRestoreAppointment}
        onSendReminder={onSendReminder}
        onUpdateStatus={onUpdateStatus}
      />
    );

    await user.click(screen.getByRole("button", { name: "Recolocar na fila" }));
    expect(onRestoreAppointment).toHaveBeenCalledWith("a3");

    const hiddenExcludeButtons = screen.getAllByRole("button", { name: "Excluir" });
    await user.click(hiddenExcludeButtons[hiddenExcludeButtons.length - 1]!);
    expect(onDeleteHiddenAppointment).toHaveBeenCalledWith("a3");
  });

  it("permite reenviar lembrete quando o atendimento ja foi sinalizado", async () => {
    const user = userEvent.setup();
    const onDeleteAppointment = vi.fn();
    const onDeleteHiddenAppointment = vi.fn();
    const onRestoreAppointment = vi.fn();
    const onSendReminder = vi.fn();
    const onUpdateStatus = vi.fn();

    render(
      <AppointmentTable
        appointments={[{ ...appointments[0], reminderSent: true }]}
        hiddenAppointments={[]}
        onDeleteAppointment={onDeleteAppointment}
        onDeleteHiddenAppointment={onDeleteHiddenAppointment}
        onRestoreAppointment={onRestoreAppointment}
        onSendReminder={onSendReminder}
        onUpdateStatus={onUpdateStatus}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Reenviar lembrete" })[0]!);
    expect(onSendReminder).toHaveBeenCalledWith("a1");
  });
});