import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickBookingForm } from "./QuickBookingForm";
import type { Customer, Pet, ServiceItem } from "../types";

const customers: Customer[] = [
  { id: "c1", name: "Mariana Alves", phone: "+55 11 99123-4567", email: "mariana@cliente.com" }
];

const pets: Pet[] = [
  { id: "p1", customerId: "c1", name: "Luna", species: "Canina", breed: "Shih-tzu" }
];

const services: ServiceItem[] = [
  { id: "s1", name: "Banho", durationMinutes: 60, price: 60 },
  { id: "s2", name: "Tosa", durationMinutes: 45, price: 55 }
];

describe("QuickBookingForm interactions", () => {
  afterEach(() => {
    cleanup();
  });

  it("envia payload manual ao salvar novo atendimento", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuickBookingForm customers={customers} pets={pets} services={services} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Cliente"), "Mariana Alves");
    await user.type(screen.getByLabelText("Pet"), "Luna");
    await user.type(screen.getByLabelText("Serviço"), "Banho especial");
    await user.clear(screen.getByLabelText("Valor do serviço"));
    await user.type(screen.getByLabelText("Valor do serviço"), "88,50");
    await user.click(screen.getByRole("button", { name: "Salvar agendamento" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "c1",
          petId: "p1",
          serviceName: "Banho especial",
          servicePrice: 88.5
        })
      );
    });
  });

  it("nao mostra sugestoes abaixo de serviço e valor do serviço", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuickBookingForm customers={customers} pets={pets} services={services} onSubmit={onSubmit} />);

    expect(screen.queryByRole("button", { name: /Banho 60 min/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "R$ 45.00" })).not.toBeInTheDocument();
  });
});